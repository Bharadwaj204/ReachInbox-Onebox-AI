import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppConfig } from '../config/app.config';

export class QdrantService {
  private baseUrl: string;
  private collectionName: string = 'product_data';
  private isConnected: boolean = false;
  private genAI: GoogleGenerativeAI;
  private embeddingModel: any;

  constructor() {
    this.baseUrl = `http://${AppConfig.qdrant.host}:${AppConfig.qdrant.port}`;
    this.genAI = new GoogleGenerativeAI(AppConfig.gemini.apiKey);
    // Use embedding model for generating embeddings
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
    
    // Test connection
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await axios.get(`${this.baseUrl}/collections`);
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
        // Create collection
        await axios.put(`${this.baseUrl}/collections/${this.collectionName}`, {
          vectors: {
            size: 768, // Embedding size for embedding-001 model
            distance: 'Cosine'
          }
        });
        
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
      const response = await axios.get(`${this.baseUrl}/collections`);
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
      });
      
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
      
      // Search for similar vectors
      const response = await axios.post(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true
      });
      
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