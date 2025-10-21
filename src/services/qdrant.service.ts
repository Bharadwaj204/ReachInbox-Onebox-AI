import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppConfig } from '../config/app.config';

export class QdrantService {
  private baseUrl: string = '';
  private collectionName: string = 'product_data';
  private isConnected: boolean = false;
  private genAI: GoogleGenerativeAI | null = null;
  private embeddingModel: any;

  constructor() {
    // Add a small delay to ensure environment variables are loaded
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    // Wait a bit for environment variables to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Debug logging to see what values are being read
    console.log('Qdrant config:', {
      host: AppConfig.qdrant.host,
      port: AppConfig.qdrant.port,
      apiKeyExists: !!AppConfig.qdrant.apiKey,
      apiKeyLength: AppConfig.qdrant.apiKey ? AppConfig.qdrant.apiKey.length : 0
    });
    
    // Use HTTPS for Qdrant Cloud
    const protocol = AppConfig.qdrant.host.includes('cloud.qdrant.io') ? 'https' : 'http';
    this.baseUrl = `${protocol}://${AppConfig.qdrant.host}:${AppConfig.qdrant.port}`;
    
    console.log('Qdrant base URL:', this.baseUrl);
    
    this.genAI = new GoogleGenerativeAI(AppConfig.gemini.apiKey);
    // Use embedding model for generating embeddings
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
    
    // Test connection
    this.testConnection();
  }

  // Getter for isConnected status
  public getIsConnected(): boolean {
    return this.isConnected;
  }

  private async testConnection(): Promise<void> {
    // Check if genAI is initialized
    if (!this.genAI) {
      console.warn('Qdrant service not properly initialized. Skipping connection test.');
      this.isConnected = false;
      return;
    }

    try {
      // Configure axios with API key if available
      const config: any = {};
      if (AppConfig.qdrant.apiKey) {
        config.headers = {
          'api-key': AppConfig.qdrant.apiKey
        };
      }
      
      console.log('Testing Qdrant connection to:', `${this.baseUrl}/collections`);
      await axios.get(`${this.baseUrl}/collections`, config);
      this.isConnected = true;
      console.log('Qdrant connection established');
    } catch (error) {
      console.warn('Qdrant connection failed. Service will run in degraded mode.', error);
      this.isConnected = false;
    }
  }

  public async initializeCollection(): Promise<void> {
    if (!this.isConnected) {
      console.warn('Qdrant not connected. Skipping collection initialization.');
      return;
    }
    
    try {
      // Check if collection exists
      const collections = await this.getCollections();
      
      if (!collections.includes(this.collectionName)) {
        // Create collection with API key authentication
        const config: any = {};
        if (AppConfig.qdrant.apiKey) {
          config.headers = {
            'api-key': AppConfig.qdrant.apiKey
          };
        }
        
        await axios.put(`${this.baseUrl}/collections/${this.collectionName}`, {
          vectors: {
            size: 768, // Embedding size for embedding-001 model
            distance: 'Cosine'
          }
        }, config);
        
        console.log(`Created Qdrant collection: ${this.collectionName}`);
      } else {
        console.log(`Qdrant collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      console.error('Error initializing Qdrant collection:', error);
    }
  }

  private async getCollections(): Promise<string[]> {
    if (!this.isConnected) {
      return [];
    }
    
    try {
      // Configure axios with API key if available
      const config: any = {};
      if (AppConfig.qdrant.apiKey) {
        config.headers = {
          'api-key': AppConfig.qdrant.apiKey
        };
      }
      
      const response = await axios.get(`${this.baseUrl}/collections`, config);
      return response.data.result.collections.map((col: any) => col.name);
    } catch (error) {
      console.error('Error fetching collections:', error);
      return [];
    }
  }

  public async addProductData(id: string, text: string, metadata: any): Promise<void> {
    if (!this.isConnected) {
      console.warn('Qdrant not connected. Skipping product data addition.');
      return;
    }
    
    try {
      // Generate embedding using Gemini
      const embedding = await this.generateEmbedding(text);
      
      // Configure axios with API key if available
      const config: any = {};
      if (AppConfig.qdrant.apiKey) {
        config.headers = {
          'api-key': AppConfig.qdrant.apiKey
        };
      }
      
      await axios.put(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        points: [
          {
            id: id,
            vector: embedding,
            payload: {
              text: text,
              ...metadata
            }
          }
        ]
      }, config);
      
      console.log(`Added product data with ID: ${id}`);
    } catch (error) {
      console.error('Error adding product data:', error);
    }
  }

  public async searchSimilarProducts(query: string, limit: number = 5): Promise<any[]> {
    if (!this.isConnected) {
      console.warn('Qdrant not connected. Search not available.');
      return [];
    }
    
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Configure axios with API key if available
      const config: any = {};
      if (AppConfig.qdrant.apiKey) {
        config.headers = {
          'api-key': AppConfig.qdrant.apiKey
        };
      }
      
      // Search for similar vectors
      const response = await axios.post(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true
      }, config);
      
      return response.data.result;
    } catch (error) {
      console.error('Error searching similar products:', error);
      return [];
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use Gemini embedding API
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a placeholder array of the correct size
      return Array(768).fill(0).map(() => Math.random());
    }
  }
}