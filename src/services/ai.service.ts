import { GoogleGenerativeAI } from '@google/generative-ai';
import { Email, EmailCategory, AICategorizationResult } from '../types/email.types';
import { AppConfig } from '../config/app.config';
import fs from 'fs';
import path from 'path';

export class AIService {
  private genAI: GoogleGenerativeAI | undefined;
  private model: any; // Using 'any' to avoid type issues
  private embeddingModel: any; // For generating embeddings
  private sentimentModel: any; // For sentiment analysis
  private intentModel: any; // For intent classification
  private feedbackFilePath: string = '';
  private isValidKey: boolean = true;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private requestLimit: number = 15; // Limit requests per minute
  private requestWindow: number = 60000; // 1 minute in milliseconds

  constructor() {
    // Validate API key
    if (!AppConfig.gemini.apiKey || AppConfig.gemini.apiKey === 'your-actual-gemini-api-key-from-ai-studio') {
      console.warn('Invalid Gemini API key. AI categorization will be disabled.');
      this.isValidKey = false;
      return;
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(AppConfig.gemini.apiKey);
      // Use gemini-2.0-flash-001 which works based on our API test
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
      // Use embedding model for generating embeddings
      this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      // For multi-model approach, we'll use the same model but with different prompts
      this.sentimentModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
      this.intentModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
      
      // Set up feedback file path
      this.feedbackFilePath = path.join(__dirname, '../../data/ai_feedback.json');
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.feedbackFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error initializing Gemini AI:', error);
      this.isValidKey = false;
    }
  }

  private async checkRateLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.requestWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // Check if we're within the limit
    if (this.requestCount < this.requestLimit) {
      this.requestCount++;
      return true; // Within limit
    }
    
    // Would exceed limit, wait until next window
    const timeToWait = this.requestWindow - (now - this.lastRequestTime);
    if (timeToWait > 0) {
      console.log(`Rate limit reached. Waiting ${Math.ceil(timeToWait/1000)} seconds before next request.`);
      await this.delay(timeToWait);
      this.requestCount = 1;
      this.lastRequestTime = Date.now();
    }
    
    return true;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async categorizeEmail(email: Email): Promise<AICategorizationResult> {
    // If API key is invalid, return default category
    if (!this.isValidKey || !this.genAI) {
      console.warn('Gemini API not available. Defaulting to Spam category.');
      return {
        category: EmailCategory.SPAM,
        confidence: 0.5,
        reasoning: ['AI service unavailable']
      };
    }
    
    // Check rate limit
    await this.checkRateLimit();
    
    // Implement retry logic with exponential backoff for rate limiting
    const maxRetries = 3; // Reduce retries to avoid excessive delays
    let retries = 0;
    let delayMs = 1000; // Start with 1 second delay
    
    while (retries <= maxRetries) {
      try {
        // Multi-model approach:
        // 1. Main categorization model
        const mainCategory = await this.getMainCategory(email);
        
        // 2. Sentiment analysis model
        const sentiment = await this.getSentimentAnalysis(email);
        
        // 3. Intent classification model
        const intent = await this.getIntentClassification(email);
        
        // Combine results for final categorization
        const finalResult = this.combineModelResults(mainCategory, sentiment, intent, email);
        
        return finalResult;
      } catch (error: any) {
        // Check if this is a rate limiting error
        if (error.message && (error.message.includes('429') || error.message.includes('quota')) && retries < maxRetries) {
          console.warn(`Rate limit hit. Retry ${retries + 1}/${maxRetries} in ${delayMs}ms`);
          
          // Extract retry delay from error message if available
          const retryMatch = error.message.match(/Please retry in ([\d.]+)s/);
          if (retryMatch) {
            const retrySeconds = parseFloat(retryMatch[1]);
            delayMs = Math.max(delayMs, retrySeconds * 1000);
          } else {
            // If no specific delay mentioned, use exponential backoff
            delayMs = Math.min(delayMs * 2 + Math.random() * 1000, 30000); // Cap at 30 seconds
          }
          
          // Wait before retrying
          await this.delay(delayMs);
          
          retries++;
          continue;
        } else {
          console.error('Error categorizing email with AI:', error);
          return {
            category: EmailCategory.SPAM,
            confidence: 0.2,
            reasoning: ['AI processing error']
          };
        }
      }
    }
    
    // If we've exhausted retries, return default category
    console.error('Exhausted retries for AI categorization. Defaulting to Spam.');
    return {
      category: EmailCategory.SPAM,
      confidence: 0.1,
      reasoning: ['Retry limit exceeded']
    };
  }

  private async getMainCategory(email: Email): Promise<{ category: EmailCategory; confidence: number; reasoning: string[] }> {
    const prompt = `
      You are an expert email classifier. Your task is to analyze the provided email text and categorize it into one of the following labels: Interested, Meeting Booked, Not Interested, Spam, or Out of Office.
      
      Additionally, provide:
      1. A confidence score between 0.0 and 1.0 (where 1.0 is highest confidence)
      2. A brief explanation of why you chose this category (2-3 short bullet points)
      
      Analyze the following email and categorize it into one of these categories:
      - Interested: The recipient shows interest in the product/service
      - Meeting Booked: The recipient has scheduled or confirmed a meeting
      - Not Interested: The recipient explicitly declines or shows no interest
      - Spam: Unsolicited commercial email or clearly unwanted content
      - Out of Office: Automated response indicating the recipient is away
      
      Email details:
      Subject: ${email.subject}
      From: ${email.from}
      To: ${email.to}
      Body: ${email.body}
      
      Respond ONLY in this exact JSON format:
      {
        "category": "one of the five categories",
        "confidence": confidence score as a number between 0.0 and 1.0,
        "reasoning": ["bullet point 1", "bullet point 2", "bullet point 3"]
      }
    `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON from the response
    let jsonStart = text.indexOf('{');
    let jsonEnd = text.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonString = text.substring(jsonStart, jsonEnd);
      const parsedResult = JSON.parse(jsonString);
      
      // Validate that the category is one of our defined categories
      if (Object.values(EmailCategory).includes(parsedResult.category as EmailCategory)) {
        return {
          category: parsedResult.category as EmailCategory,
          confidence: Math.max(0, Math.min(1, parsedResult.confidence)), // Clamp between 0 and 1
          reasoning: Array.isArray(parsedResult.reasoning) ? parsedResult.reasoning : []
        };
      }
    }
    
    // Default fallback
    return {
      category: EmailCategory.SPAM,
      confidence: 0.3,
      reasoning: ['Invalid AI response format']
    };
  }

  private async getSentimentAnalysis(email: Email): Promise<{ sentiment: string; confidence: number }> {
    const prompt = `
      Analyze the sentiment of the following email and classify it as one of: Positive, Neutral, Negative, or Automated.
      
      Email details:
      Subject: ${email.subject}
      Body: ${email.body}
      
      Respond ONLY in this exact JSON format:
      {
        "sentiment": "one of the four sentiment labels",
        "confidence": confidence score as a number between 0.0 and 1.0
      }
    `;

    const result = await this.sentimentModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON from the response
    let jsonStart = text.indexOf('{');
    let jsonEnd = text.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonString = text.substring(jsonStart, jsonEnd);
      const parsedResult = JSON.parse(jsonString);
      
      return {
        sentiment: parsedResult.sentiment,
        confidence: Math.max(0, Math.min(1, parsedResult.confidence))
      };
    }
    
    // Default fallback
    return {
      sentiment: 'Neutral',
      confidence: 0.5
    };
  }

  private async getIntentClassification(email: Email): Promise<{ intent: string; confidence: number }> {
    const prompt = `
      Analyze the intent of the following email and classify it as one of: Inquiry, Confirmation, Rejection, Informational, or Automated.
      
      Email details:
      Subject: ${email.subject}
      Body: ${email.body}
      
      Respond ONLY in this exact JSON format:
      {
        "intent": "one of the five intent labels",
        "confidence": confidence score as a number between 0.0 and 1.0
      }
    `;

    const result = await this.intentModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON from the response
    let jsonStart = text.indexOf('{');
    let jsonEnd = text.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonString = text.substring(jsonStart, jsonEnd);
      const parsedResult = JSON.parse(jsonString);
      
      return {
        intent: parsedResult.intent,
        confidence: Math.max(0, Math.min(1, parsedResult.confidence))
      };
    }
    
    // Default fallback
    return {
      intent: 'Informational',
      confidence: 0.5
    };
  }

  private combineModelResults(
    mainCategory: { category: EmailCategory; confidence: number; reasoning: string[] },
    sentiment: { sentiment: string; confidence: number },
    intent: { intent: string; confidence: number },
    email: Email
  ): AICategorizationResult {
    // Adjust confidence based on sentiment and intent alignment
    let adjustedConfidence = mainCategory.confidence;
    let additionalReasoning: string[] = [];
    
    // Check for alignment between models
    if (sentiment.sentiment === 'Positive' && mainCategory.category === EmailCategory.INTERESTED) {
      adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.1);
      additionalReasoning.push('Sentiment analysis confirms positive sentiment');
    } else if (sentiment.sentiment === 'Negative' && mainCategory.category === EmailCategory.NOT_INTERESTED) {
      adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.1);
      additionalReasoning.push('Sentiment analysis confirms negative sentiment');
    } else if (sentiment.sentiment === 'Automated' && mainCategory.category === EmailCategory.OUT_OF_OFFICE) {
      adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.15);
      additionalReasoning.push('Sentiment analysis confirms automated response');
    }
    
    // Check intent alignment
    if (intent.intent === 'Confirmation' && mainCategory.category === EmailCategory.MEETING_BOOKED) {
      adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.1);
      additionalReasoning.push('Intent analysis confirms meeting confirmation');
    } else if (intent.intent === 'Rejection' && mainCategory.category === EmailCategory.NOT_INTERESTED) {
      adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.1);
      additionalReasoning.push('Intent analysis confirms rejection');
    }
    
    // Special case for spam detection
    if (mainCategory.category === EmailCategory.SPAM) {
      // If sentiment is very negative and intent is informational, it might be spam
      if (sentiment.sentiment === 'Negative' && sentiment.confidence > 0.8 && 
          intent.intent === 'Informational' && intent.confidence > 0.7) {
        adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.15);
        additionalReasoning.push('Combined analysis confirms spam characteristics');
      }
    }
    
    return {
      category: mainCategory.category,
      confidence: adjustedConfidence,
      reasoning: [...mainCategory.reasoning, ...additionalReasoning]
    };
  }

  // Method to generate email summary using AI
  public async summarizeEmail(email: Email): Promise<string> {
    // Check rate limit
    await this.checkRateLimit();
    
    if (!this.isValidKey || !this.genAI) {
      // Fallback to simple summarization
      return this.simpleSummarize(email.body, email.subject);
    }
    
    // Implement retry logic with exponential backoff for rate limiting
    const maxRetries = 3;
    let retries = 0;
    let delayMs = 1000; // Start with 1 second delay
    
    while (retries <= maxRetries) {
      try {
        const prompt = `
          Summarize the following email in one concise sentence (maximum 100 characters):
          
          Subject: ${email.subject}
          Body: ${email.body}
          
          Summary:
        `;
        
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text().trim();
        
        // Ensure summary is not too long
        if (summary.length > 100) {
          return summary.substring(0, 97) + '...';
        }
        
        return summary;
      } catch (error: any) {
        // Check if this is a rate limiting error
        if (error.message && (error.message.includes('429') || error.message.includes('quota')) && retries < maxRetries) {
          console.warn(`Rate limit hit during email summarization. Retry ${retries + 1}/${maxRetries} in ${delayMs}ms`);
          
          // Extract retry delay from error message if available
          const retryMatch = error.message.match(/Please retry in ([\d.]+)s/);
          if (retryMatch) {
            const retrySeconds = parseFloat(retryMatch[1]);
            delayMs = Math.max(delayMs, retrySeconds * 1000);
          } else {
            // If no specific delay mentioned, use exponential backoff
            delayMs = Math.min(delayMs * 2 + Math.random() * 1000, 30000); // Cap at 30 seconds
          }
          
          // Wait before retrying
          await this.delay(delayMs);
          
          retries++;
          continue;
        } else {
          console.error('Error summarizing email with AI:', error);
          // Fallback to simple summarization
          return this.simpleSummarize(email.body, email.subject);
        }
      }
    }
    
    // If we've exhausted retries, fallback to simple summarization
    console.error('Exhausted retries for email summarization. Using simple summarization.');
    return this.simpleSummarize(email.body, email.subject);
  }

  // Simple summarization as fallback
  private simpleSummarize(body: string, subject: string): string {
    // Combine subject and body for summary
    const content = `${subject}. ${body}`;
    
    // Simple summarization: take first 100 characters and ensure we don't cut off words
    if (content.length <= 100) {
      return content;
    }
    
    let summary = content.substring(0, 100);
    // Find last space to avoid cutting off words
    const lastSpace = summary.lastIndexOf(' ');
    if (lastSpace > 0) {
      summary = summary.substring(0, lastSpace);
    }
    
    return summary + '...';
  }

  // Method to process user feedback for improving AI accuracy
  public async processUserFeedback(emailId: string, originalCategory: EmailCategory, correctedCategory: EmailCategory, email: Email): Promise<void> {
    try {
      // Create feedback entry
      const feedbackEntry = {
        emailId,
        originalCategory,
        correctedCategory,
        timestamp: new Date().toISOString(),
        emailSubject: email.subject,
        emailBody: email.body.substring(0, 500) // Limit body size for storage
      };

      // Read existing feedback
      let feedbackData: any[] = [];
      if (fs.existsSync(this.feedbackFilePath)) {
        const fileContent = fs.readFileSync(this.feedbackFilePath, 'utf8');
        feedbackData = JSON.parse(fileContent || '[]');
      }

      // Add new feedback entry
      feedbackData.push(feedbackEntry);

      // Save feedback to file
      fs.writeFileSync(this.feedbackFilePath, JSON.stringify(feedbackData, null, 2));

      console.log(`User feedback recorded for email ${emailId}: ${originalCategory} -> ${correctedCategory}`);
    } catch (error) {
      console.error('Error recording user feedback:', error);
    }
  }

  // Method to get feedback statistics
  public getFeedbackStats(): { total: number; corrections: Record<string, number> } {
    try {
      if (!fs.existsSync(this.feedbackFilePath)) {
        return { total: 0, corrections: {} };
      }

      const fileContent = fs.readFileSync(this.feedbackFilePath, 'utf8');
      const feedbackData = JSON.parse(fileContent || '[]');
      
      const corrections: Record<string, number> = {};
      
      // Count corrections by original category
      feedbackData.forEach((entry: any) => {
        const key = `${entry.originalCategory} -> ${entry.correctedCategory}`;
        corrections[key] = (corrections[key] || 0) + 1;
      });
      
      return {
        total: feedbackData.length,
        corrections
      };
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return { total: 0, corrections: {} };
    }
  }
}