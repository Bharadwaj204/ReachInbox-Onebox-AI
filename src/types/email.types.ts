export interface Email {
  id: string;
  messageId: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  date: Date;
  folder: string;
  accountId: string;
  aiCategory?: EmailCategory;
  aiConfidence?: number; // Add confidence score
  aiReasoning?: string[]; // Add reasoning for AI decision
  threadId?: string; // Add thread ID for email threading
  summary?: string; // Add summary field
}

export enum EmailCategory {
  INTERESTED = 'Interested',
  MEETING_BOOKED = 'Meeting Booked',
  NOT_INTERESTED = 'Not Interested',
  SPAM = 'Spam',
  OUT_OF_OFFICE = 'Out of Office'
}

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  folder: string;
  tls?: boolean;
  accountId: string;
  oauth2Token?: string; // OAuth2 access token
  useOAuth2?: boolean;  // Flag to indicate if OAuth2 should be used
}

// Add interface for AI categorization result with confidence
export interface AICategorizationResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string[];
}