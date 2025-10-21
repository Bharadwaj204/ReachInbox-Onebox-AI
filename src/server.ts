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
console.log('QDRANT_HOST:', process.env.QDRANT_HOST);
console.log('QDRANT_PORT:', process.env.QDRANT_PORT);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

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
      qdrant: 'initialized' // Qdrant is initialized in RAG service
    }
  });
});

// Serve frontend
app.use(express.static('public'));
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Services
const imapService = new ImapService();
const elasticsearchService = new ElasticsearchService();
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