import { ElasticsearchService } from './elasticsearch.service';
import { AIService } from './ai.service';
import { Email } from '../types/email.types';

export class ScheduledProcessor {
  private elasticsearchService: ElasticsearchService;
  private aiService: AIService;
  private isProcessing: boolean = false;

  constructor() {
    this.elasticsearchService = new ElasticsearchService();
    this.aiService = new AIService();
  }

  // Process emails that haven't been categorized yet
  public async processUncategorizedEmails(batchSize: number = 50): Promise<void> {
    if (this.isProcessing) {
      console.log('Scheduled processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log(`Starting scheduled processing of up to ${batchSize} uncategorized emails...`);

    try {
      // Search for emails without AI categorization
      const uncategorizedEmails = await this.elasticsearchService.searchEmails('', {
        aiCategory: 'Uncategorized'
      });

      console.log(`Found ${uncategorizedEmails.length} uncategorized emails`);

      // Process in batches to avoid rate limiting
      const emailsToProcess = uncategorizedEmails.slice(0, batchSize);
      
      for (const email of emailsToProcess) {
        try {
          console.log(`Processing email: ${email.subject}`);
          
          // Categorize email using AI
          const aiResult = await this.aiService.categorizeEmail(email);
          
          // Update email with AI results
          await this.elasticsearchService.updateEmailAIResults(
            email.id,
            aiResult.category,
            aiResult.confidence,
            aiResult.reasoning
          );
          
          console.log(`Processed email ${email.id} with category: ${aiResult.category} (confidence: ${aiResult.confidence})`);
          
          // Small delay to avoid overwhelming the API
          await this.delay(1000);
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
        }
      }
      
      console.log(`Completed scheduled processing of ${emailsToProcess.length} emails`);
    } catch (error) {
      console.error('Error in scheduled email processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Re-process emails with low confidence
  public async reprocessLowConfidenceEmails(threshold: number = 0.5, batchSize: number = 30): Promise<void> {
    if (this.isProcessing) {
      console.log('Scheduled processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log(`Starting reprocessing of up to ${batchSize} low-confidence emails (threshold: ${threshold})...`);

    try {
      // Search for emails with low confidence
      // Note: This is a simplified approach. In a real implementation, you'd need to query by confidence score
      const allEmails = await this.elasticsearchService.searchEmails('', {});
      const lowConfidenceEmails = allEmails
        .filter(email => email.aiConfidence !== undefined && email.aiConfidence < threshold)
        .slice(0, batchSize);

      console.log(`Found ${lowConfidenceEmails.length} low-confidence emails`);

      for (const email of lowConfidenceEmails) {
        try {
          console.log(`Reprocessing email: ${email.subject} (current confidence: ${email.aiConfidence})`);
          
          // Categorize email using AI
          const aiResult = await this.aiService.categorizeEmail(email);
          
          // Update email with new AI results
          await this.elasticsearchService.updateEmailAIResults(
            email.id,
            aiResult.category,
            aiResult.confidence,
            aiResult.reasoning
          );
          
          console.log(`Reprocessed email ${email.id} with category: ${aiResult.category} (new confidence: ${aiResult.confidence})`);
          
          // Small delay to avoid overwhelming the API
          await this.delay(1000);
        } catch (error) {
          console.error(`Error reprocessing email ${email.id}:`, error);
        }
      }
      
      console.log(`Completed reprocessing of ${lowConfidenceEmails.length} emails`);
    } catch (error) {
      console.error('Error in scheduled reprocessing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Generate summaries for emails without them
  public async generateMissingSummaries(batchSize: number = 50): Promise<void> {
    if (this.isProcessing) {
      console.log('Scheduled processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log(`Starting summary generation for up to ${batchSize} emails without summaries...`);

    try {
      // Search for emails without summaries
      const allEmails = await this.elasticsearchService.searchEmails('', {});
      const emailsWithoutSummaries = allEmails
        .filter(email => !email.summary || email.summary.length === 0)
        .slice(0, batchSize);

      console.log(`Found ${emailsWithoutSummaries.length} emails without summaries`);

      for (const email of emailsWithoutSummaries) {
        try {
          console.log(`Generating summary for email: ${email.subject}`);
          
          // Generate summary
          const summary = await this.aiService.summarizeEmail(email);
          
          // Update email with summary
          await this.elasticsearchService.updateEmailSummary(email.id, summary);
          
          console.log(`Generated summary for email ${email.id}: ${summary}`);
          
          // Small delay to avoid overwhelming the API
          await this.delay(1000);
        } catch (error) {
          console.error(`Error generating summary for email ${email.id}:`, error);
        }
      }
      
      console.log(`Completed summary generation for ${emailsWithoutSummaries.length} emails`);
    } catch (error) {
      console.error('Error in summary generation:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Start scheduled processing
  public startScheduledProcessing(): void {
    console.log('Starting scheduled email processing service...');
    
    // Process uncategorized emails every 30 minutes
    setInterval(async () => {
      await this.processUncategorizedEmails(50);
    }, 30 * 60 * 1000); // 30 minutes
    
    // Reprocess low-confidence emails every hour
    setInterval(async () => {
      await this.reprocessLowConfidenceEmails(0.5, 30);
    }, 60 * 60 * 1000); // 1 hour
    
    // Generate missing summaries every 2 hours
    setInterval(async () => {
      await this.generateMissingSummaries(50);
    }, 2 * 60 * 60 * 1000); // 2 hours
  }
}