import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantService } from './qdrant.service';
import { AppConfig } from '../config/app.config';

export class RAGService {
  private genAI: GoogleGenerativeAI;
  private model: any; // Using 'any' to avoid type issues
  private embeddingModel: any; // For generating embeddings
  private qdrantService: QdrantService;

  constructor() {
    // Add debug logging
    console.log('Initializing RAG service with Qdrant config:', {
      qdrantHost: AppConfig.qdrant.host,
      qdrantPort: AppConfig.qdrant.port
    });
    
    this.genAI = new GoogleGenerativeAI(AppConfig.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
    // Use embedding model for generating embeddings
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
    this.qdrantService = new QdrantService();
    
    // Initialize Qdrant collection
    this.qdrantService.initializeCollection();
    
    // Add sample product data for demonstration
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    try {
      // Add some sample product data for demonstration
      await this.addProductData('job-application', 
        'I am applying for a job position. If the lead is interested, share the meeting booking link: https://cal.com/example',
        { type: 'job', category: 'career' }
      );
      
      await this.addProductData('product-demo',
        'We offer a revolutionary AI-powered email solution. If interested, schedule a demo at https://cal.com/reachinbox-demo',
        { type: 'product', category: 'software' }
      );
      
      await this.addProductData('service-inquiry',
        'Our company provides premium consulting services. For more information, visit our website or book a consultation call.',
        { type: 'service', category: 'consulting' }
      );
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }

  public async generateSuggestedReply(emailContent: string, productId?: string): Promise<string> {
    try {
      // Step 1: Generate embedding for the query
      console.log('Generating embedding for email content...');
      const queryEmbedding = await this.embeddingModel.embedContent(emailContent);
      
      // Step 2: Search for similar products in Qdrant
      console.log('Searching for relevant context in vector database...');
      const searchResults = await this.qdrantService.searchSimilarProducts(emailContent, 3);
      const context = searchResults.map((result: any) => result.payload.text).join('\n\n');
      
      // Step 3: Assemble the final prompt with system instruction, context, and original email
      const prompt = `
        Act as a helpful assistant that writes professional, relevant email replies.
        
        Based ONLY on the context provided and the original email, draft a professional and helpful reply. Be concise.
        
        Context:
        ${context}
        
        Original Email:
        ${emailContent}
      `;

      console.log('Generating suggested reply with Gemini AI...');
      const result = await this.model.generateContent([
        {
          text: prompt
        }
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating suggested reply:', error);
      return 'Unable to generate suggested reply at this time.';
    }
  }

  public async addProductData(id: string, text: string, metadata: any): Promise<void> {
    try {
      await this.qdrantService.addProductData(id, text, metadata);
      console.log(`Added product data to RAG system: ${id}`);
    } catch (error) {
      console.error('Error adding product data to RAG system:', error);
    }
  }
}