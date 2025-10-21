// Load environment variables first
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env') });

// Debug output
console.log('Current working directory:', __dirname);
console.log('Env file path:', resolve(__dirname, '../.env'));
console.log('File exists:', require('fs').existsSync(resolve(__dirname, '../.env')));

console.log('Environment Variables:');
console.log('ELASTICSEARCH_HOST:', process.env.ELASTICSEARCH_HOST);
console.log('ELASTICSEARCH_PORT:', process.env.ELASTICSEARCH_PORT);
console.log('ELASTICSEARCH_CLOUD_ID:', process.env.ELASTICSEARCH_CLOUD_ID);
console.log('ELASTICSEARCH_USERNAME:', process.env.ELASTICSEARCH_USERNAME);
console.log('ELASTICSEARCH_PASSWORD:', process.env.ELASTICSEARCH_PASSWORD);
console.log('QDRANT_HOST:', process.env.QDRANT_HOST);
console.log('QDRANT_PORT:', process.env.QDRANT_PORT);
console.log('QDRANT_API_KEY exists:', !!process.env.QDRANT_API_KEY);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

// Add debug logging for all IMAP variables
console.log('IMAP Variables:');
console.log('IMAP_HOST_1:', process.env.IMAP_HOST_1);
console.log('IMAP_PORT_1:', process.env.IMAP_PORT_1);
console.log('IMAP_USER_1:', process.env.IMAP_USER_1);
console.log('IMAP_PASSWORD_1 exists:', !!process.env.IMAP_PASSWORD_1);
console.log('IMAP_HOST_2:', process.env.IMAP_HOST_2);
console.log('IMAP_PORT_2:', process.env.IMAP_PORT_2);
console.log('IMAP_USER_2:', process.env.IMAP_USER_2);
console.log('IMAP_PASSWORD_2 exists:', !!process.env.IMAP_PASSWORD_2);

import express, { Request, Response } from 'express';
import path from 'path';
import emailRoutes from './routes/email.routes';
import { ImapService } from './services/imap.service';
import { ElasticsearchService } from './services/elasticsearch.service';
import { AIService } from './services/ai.service';
import { WebhookService } from './services/webhook.service';
import { ScheduledProcessor } from './services/scheduled.processor';
import { Email, EmailCategory } from './types/email.types';
import { AppConfig } from './config/app.config';

// Debug the imported routes
console.log('Email routes type:', typeof emailRoutes);
console.log('AppConfig values:', {
  elasticsearch: AppConfig.elasticsearch,
  qdrant: AppConfig.qdrant,
  gemini: AppConfig.gemini
});

const app = express();
const port = AppConfig.server.port;

// Middleware
app.use(express.json());

// API Routes
console.log('Registering email routes...');
app.use('/api/emails', emailRoutes);
console.log('Email routes registered successfully');

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      imap: 'initialized',
      elasticsearch: elasticsearchService['isConnected'] ? 'connected' : 'disconnected',
      qdrant: qdrantService && qdrantService['isConnected'] ? 'connected' : 'disconnected'
    }
  });
});

// Simple ping endpoint for Render health checks
app.get('/ping', (req: Request, res: Response) => {
  res.json({ 
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend
app.use(express.static('public'));
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Services - Initialize in proper order
console.log('Initializing services...');
const imapService = new ImapService();
const elasticsearchService = new ElasticsearchService();

// Initialize RAG service (which includes Qdrant) after config is loaded
let ragService: any = null;
let qdrantService: any = null;

try {
  // Import RAG service dynamically to ensure config is loaded
  const { RAGService } = require('./services/rag.service');
  ragService = new RAGService();
  // Access the qdrantService from RAG service
  qdrantService = ragService['qdrantService'];
  console.log('RAG and Qdrant services initialized successfully');
} catch (error) {
  console.error('Failed to initialize RAG service:', error);
}

const aiService = new AIService();
const webhookService = new WebhookService();
const scheduledProcessor = new ScheduledProcessor();

// Handle new emails from IMAP
imapService.on('newEmail', async (email: Email) => {
  try {
    // Initialize emailWithSummary with the original email
    let emailWithSummary = { ...email };
    
    try {
      // Generate email summary
      const summary = await aiService.summarizeEmail(email);
      
      // Add summary to email
      emailWithSummary = {
        ...email,
        summary: summary
      };
    } catch (summaryError) {
      console.error('Error generating email summary (continuing without summary):', summaryError);
      // Continue with original email if summary fails
    }
    
    // Index email in Elasticsearch (even if AI processing fails)
    await elasticsearchService.indexEmail(emailWithSummary);
    
    try {
      // Categorize email using AI
      const aiResult = await aiService.categorizeEmail(emailWithSummary);
      
      // Update email with AI category, confidence, and reasoning
      const updatedEmail = {
        ...emailWithSummary,
        aiCategory: aiResult.category,
        aiConfidence: aiResult.confidence,
        aiReasoning: aiResult.reasoning
      };
      
      // Update email in Elasticsearch with AI results
      await elasticsearchService.updateEmailAIResults(
        email.id, 
        aiResult.category, 
        aiResult.confidence, 
        aiResult.reasoning
      );
      
      // If category is Interested, send notifications
      if (aiResult.category === EmailCategory.INTERESTED) {
        await webhookService.sendSlackNotification(updatedEmail);
        await webhookService.sendExternalWebhook(updatedEmail);
      }
      
      console.log(`Processed email: ${email.subject} | Category: ${aiResult.category} | Confidence: ${aiResult.confidence}`);
    } catch (aiError) {
      console.error('Error processing AI categorization (email indexed without AI results):', aiError);
      // Email is already indexed, so we continue
    }
  } catch (error) {
    console.error('Error processing email:', error);
  }
});

// Initialize Elasticsearch index
elasticsearchService.initializeIndex()
  .then(() => {
    console.log('Elasticsearch initialization completed');
  })
  .catch((error: Error) => {
    console.error('Failed to initialize Elasticsearch:', error);
  });

// Start IMAP connections
imapService.connectAllAccounts()
  .then(() => {
    console.log('IMAP account connections completed');
  })
  .catch((error: Error) => {
    console.error('Failed to connect to IMAP accounts:', error);
  });

// Start scheduled processing
scheduledProcessor.startScheduledProcessing();

// Start server
app.listen(port, () => {
  console.log(`ReachInbox Onebox AI server running at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  imapService.disconnectAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  imapService.disconnectAll();
  process.exit(0);
});
// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  imapService.disconnectAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  imapService.disconnectAll();
  process.exit(0);
});