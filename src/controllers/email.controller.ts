import { ElasticsearchService } from '../services/elasticsearch.service';
import { Email } from '../types/email.types';

export class EmailController {
  private elasticsearchService: ElasticsearchService;

  constructor() {
    this.elasticsearchService = new ElasticsearchService();
  }

  public async searchEmails(query: string, filters?: { 
    folder?: string, 
    accountId?: string, 
    aiCategory?: string,
    dateFrom?: string,
    dateTo?: string,
    minConfidence?: number,
    hasThread?: boolean
  }): Promise<Email[]> {
    try {
      console.log('EmailController searchEmails called with:', { query, filters });
      const emails = await this.elasticsearchService.searchEmails(query, filters);
      console.log('EmailController returning emails count:', emails.length);
      return emails;
    } catch (error) {
      console.error('Error in email search controller:', error);
      throw error;
    }
  }

  public async getEmailById(id: string): Promise<Email | null> {
    try {
      const email = await this.elasticsearchService.getEmailById(id);
      return email;
    } catch (error) {
      console.error('Error fetching email by ID:', error);
      throw error;
    }
  }
}