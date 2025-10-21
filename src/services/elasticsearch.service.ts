import { Client } from '@elastic/elasticsearch';
import { Email } from '../types/email.types';
import { AppConfig } from '../config/app.config';

export class ElasticsearchService {
  private client: Client;
  private index: string;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;

  constructor() {
    this.client = new Client({
      node: `http://${AppConfig.elasticsearch.host}:${AppConfig.elasticsearch.port}`,
      requestTimeout: 10000, // Increase timeout to 10 seconds
      sniffOnStart: false, // Disable sniffing to avoid connection issues
      sniffInterval: false, // Disable periodic sniffing
      sniffOnConnectionFault: false // Disable sniffing on connection faults
    });
    
    this.index = AppConfig.elasticsearch.index;
    
    // Test connection with retry logic
    this.testConnectionWithRetry();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async testConnectionWithRetry(): Promise<void> {
    while (this.connectionAttempts < this.maxConnectionAttempts) {
      try {
        await this.client.ping();
        this.isConnected = true;
        console.log('Elasticsearch connection established');
        // Initialize index once connected
        await this.initializeIndex();
        return;
      } catch (error: any) {
        this.connectionAttempts++;
        console.warn(`Elasticsearch connection attempt ${this.connectionAttempts}/${this.maxConnectionAttempts} failed:`, error.message || error);
        
        if (this.connectionAttempts < this.maxConnectionAttempts) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, this.connectionAttempts) * 1000;
          console.log(`Retrying Elasticsearch connection in ${waitTime}ms...`);
          await this.delay(waitTime);
        }
      }
    }
    
    console.warn(`Failed to connect to Elasticsearch after ${this.maxConnectionAttempts} attempts. Service will run in degraded mode.`);
    this.isConnected = false;
  }

  public async initializeIndex(): Promise<void> {
    if (!this.isConnected) {
      console.warn('Elasticsearch not connected. Skipping index initialization.');
      return;
    }
    
    try {
      const indexExists = await this.client.indices.exists({ index: this.index });
      
      if (!indexExists) {
        await this.client.indices.create({
          index: this.index,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                messageId: { type: 'keyword' },
                subject: { type: 'text' },
                body: { type: 'text' },
                from: { type: 'text' },
                to: { type: 'text' },
                date: { type: 'date' },
                folder: { type: 'keyword' },
                accountId: { type: 'keyword' },
                aiCategory: { type: 'keyword' },
                aiConfidence: { type: 'float' },
                aiReasoning: { type: 'text' },
                threadId: { type: 'keyword' },
                summary: { type: 'text' }
              }
            }
          }
        });
        
        console.log(`Created Elasticsearch index: ${this.index}`);
      } else {
        console.log(`Elasticsearch index ${this.index} already exists`);
      }
    } catch (error) {
      console.error('Error initializing Elasticsearch index:', error);
    }
  }

  public async indexEmail(email: Email): Promise<void> {
    if (!this.isConnected) {
      console.warn('Elasticsearch not connected. Skipping email indexing.');
      return;
    }
    
    try {
      await this.client.index({
        index: this.index,
        id: email.id,
        body: email
      });
      
      console.log(`Indexed email: ${email.subject}`);
    } catch (error) {
      console.error('Error indexing email:', error);
    }
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
    if (!this.isConnected) {
      console.warn('Elasticsearch not connected. Search not available.');
      return [];
    }
    
    try {
      // Log the search parameters for debugging
      console.log('Search parameters:', { query, filters });
      
      const boolQuery: any = {
        must: [],
        filter: []
      };

      // Add search query if provided
      if (query) {
        boolQuery.must.push({
          multi_match: {
            query: query,
            fields: ['subject', 'body']
          }
        });
      } else {
        // If no query, match all
        boolQuery.must.push({ match_all: {} });
      }

      // Apply filters only if they are provided
      if (filters) {
        if (filters.folder) {
          boolQuery.filter.push({ term: { folder: filters.folder } });
        }

        if (filters.accountId) {
          boolQuery.filter.push({ term: { accountId: filters.accountId } });
        }

        if (filters.aiCategory) {
          boolQuery.filter.push({ term: { aiCategory: filters.aiCategory } });
        }

        // Date range filter
        if (filters.dateFrom || filters.dateTo) {
          const dateRange: any = {};
          if (filters.dateFrom) {
            // Convert YYYY-MM-DD to ISO format
            dateRange.gte = new Date(filters.dateFrom).toISOString();
          }
          if (filters.dateTo) {
            // Convert YYYY-MM-DD to ISO format and set to end of day
            const endDate = new Date(filters.dateTo);
            endDate.setHours(23, 59, 59, 999);
            dateRange.lte = endDate.toISOString();
          }
          boolQuery.filter.push({ range: { date: dateRange } });
        }

        // Confidence filter
        if (filters.minConfidence !== undefined && filters.minConfidence !== null) {
          boolQuery.filter.push({ range: { aiConfidence: { gte: filters.minConfidence } } });
        }

        // Thread filter
        if (filters.hasThread === true) {
          boolQuery.filter.push({ exists: { field: 'threadId' } });
        } else if (filters.hasThread === false) {
          boolQuery.filter.push({ bool: { must_not: [{ exists: { field: 'threadId' } }] } });
        }
      }

      // Log the final query for debugging
      console.log('Elasticsearch query:', JSON.stringify({
        index: this.index,
        body: {
          query: {
            bool: boolQuery
          },
          sort: [
            { date: { order: 'desc' } }
          ]
        }
      }, null, 2));

      const result = await this.client.search({
        index: this.index,
        body: {
          query: {
            bool: boolQuery
          },
          sort: [
            { date: { order: 'desc' } }
          ]
        }
      });

      console.log('Search result count:', result.body.hits.total.value);
      return result.body.hits.hits.map((hit: any) => hit._source as Email);
    } catch (error) {
      console.error('Error searching emails:', error);
      return [];
    }
  }

  public async getEmailById(id: string): Promise<Email | null> {
    if (!this.isConnected) {
      console.warn('Elasticsearch not connected. Get email by ID not available.');
      return null;
    }
    
    try {
      const result = await this.client.get({
        index: this.index,
        id: id
      });
      
      return result.body._source as Email;
    } catch (error: any) {
      // If email not found, return null
      if (error.statusCode === 404) {
        return null;
      }
      console.error('Error getting email by ID:', error);
      return null;
    }
  }

  public async updateEmailCategory(emailId: string, category: string): Promise<void> {
    if (!this.isConnected) {
      console.warn('Elasticsearch not connected. Skipping email category update.');
      return;
    }
    
    try {
      await this.client.update({
        index: this.index,
        id: emailId,
        body: {
          doc: {
            aiCategory: category
          }
        }
      });
      
      console.log(`Updated email ${emailId} with category: ${category}`);
    } catch (error) {
      console.error(`Error updating email ${emailId} category:`, error);
    }
  }

  // Method to update email with AI confidence and reasoning
  public async updateEmailAIResults(emailId: string, aiCategory: string, aiConfidence: number, aiReasoning: string[]): Promise<void> {
    if (!this.isConnected) {
      console.warn('Elasticsearch not connected. Skipping email AI results update.');
      return;
    }
    
    try {
      await this.client.update({
        index: this.index,
        id: emailId,
        body: {
          doc: {
            aiCategory: aiCategory,
            aiConfidence: aiConfidence,
            aiReasoning: aiReasoning
          }
        }
      });
      
      console.log(`Updated email ${emailId} with AI results`);
    } catch (error) {
      console.error(`Error updating email ${emailId} AI results:`, error);
    }
  }

  // Method to update email summary
  public async updateEmailSummary(emailId: string, summary: string): Promise<void> {
    if (!this.isConnected) {
      console.warn('Elasticsearch not connected. Skipping email summary update.');
      return;
    }
    
    try {
      await this.client.update({
        index: this.index,
        id: emailId,
        body: {
          doc: {
            summary: summary
          }
        }
      });
      
      console.log(`Updated email ${emailId} with summary`);
    } catch (error) {
      console.error(`Error updating email ${emailId} summary:`, error);
    }
  }
}