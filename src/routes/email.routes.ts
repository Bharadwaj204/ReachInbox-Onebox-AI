import express, { Request, Response } from 'express';
import { EmailController } from '../controllers/email.controller';
import { RAGService } from '../services/rag.service';
import { AIService } from '../services/ai.service';
import { EmailCategory } from '../types/email.types';

const router = express.Router();
const emailController = new EmailController();
const ragService = new RAGService();
const aiService = new AIService();

// Get accounts endpoint (must be before /:id route)
router.get('/accounts', (req: Request, res: Response) => {
  try {
    // Return configured accounts (only Gmail-compatible accounts)
    const accounts = [];
    
    // Add account 1 if configured
    if (process.env.IMAP_USER_1) {
      accounts.push({
        id: 'account1',
        name: 'Gmail Account',
        email: process.env.IMAP_USER_1,
        folder: process.env.IMAP_FOLDER_1 || 'INBOX'
      });
    }
    
    // Add account 2 if configured (treat as Gmail-compatible since we're not using Outlook anymore)
    if (process.env.IMAP_USER_2) {
      accounts.push({
        id: 'account2',
        name: 'Gmail Account',
        email: process.env.IMAP_USER_2,
        folder: process.env.IMAP_FOLDER_2 || 'INBOX'
      });
    }
    
    return res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Search emails endpoint
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { 
      q, 
      folder, 
      accountId, 
      aiCategory,
      dateFrom,
      dateTo,
      minConfidence,
      hasThread
    } = req.query as { 
      q?: string; 
      folder?: string; 
      accountId?: string; 
      aiCategory?: string;
      dateFrom?: string;
      dateTo?: string;
      minConfidence?: string;
      hasThread?: string;
    };
    
    console.log('Email routes /search called with query params:', req.query);
    
    const filters: any = {
      folder: folder || undefined,
      accountId: accountId || undefined,
      aiCategory: aiCategory || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
      hasThread: hasThread !== undefined ? hasThread === 'true' : undefined
    };
    
    console.log('Email routes /search filters:', filters);
    
    const emails = await emailController.searchEmails(q || '', filters);
    console.log('Email routes /search returning emails count:', emails.length);
    return res.json(emails);
  } catch (error) {
    console.error('Error searching emails:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Suggest reply endpoint (RAG pipeline) - must be before /:id route
router.post('/:id/suggest-reply', express.json(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { productId } = req.body;
    
    // Get email by ID
    const email = await emailController.getEmailById(id);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Generate suggested reply using RAG
    const suggestedReply = await ragService.generateSuggestedReply(email.body, productId);
    
    return res.json({ suggestedReply });
  } catch (error) {
    console.error('Error generating suggested reply:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// User feedback endpoint for AI corrections
router.post('/:id/feedback', express.json(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { correctedCategory } = req.body;
    
    // Validate corrected category
    if (!Object.values(EmailCategory).includes(correctedCategory as EmailCategory)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Get email by ID
    const email = await emailController.getEmailById(id);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Process feedback
    await aiService.processUserFeedback(id, email.aiCategory || EmailCategory.SPAM, correctedCategory as EmailCategory, email);
    
    return res.json({ message: 'Feedback recorded successfully' });
  } catch (error) {
    console.error('Error processing user feedback:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI feedback statistics
router.get('/ai/stats', async (req: Request, res: Response) => {
  try {
    const stats = aiService.getFeedbackStats();
    return res.json(stats);
  } catch (error) {
    console.error('Error getting AI stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get email by ID endpoint (this should be last)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const email = await emailController.getEmailById(id);
    
    if (email) {
      return res.json(email);
    } else {
      return res.status(404).json({ error: 'Email not found' });
    }
  } catch (error) {
    console.error('Error fetching email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;