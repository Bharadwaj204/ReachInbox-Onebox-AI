import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { Email, ImapConfig } from '../types/email.types';
import { EventEmitter } from 'events';

export class ImapService extends EventEmitter {
  private configs: ImapConfig[] = [];
  private connections: Map<string, Imap> = new Map();
  private isReady: boolean = false;

  constructor() {
    super();
    this.loadConfigs();
  }

  private loadConfigs(): void {
    // Load configuration for account 1 (Gmail)
    if (process.env.IMAP_HOST_1 && process.env.IMAP_USER_1 && process.env.IMAP_PASSWORD_1) {
      this.configs.push({
        host: process.env.IMAP_HOST_1,
        port: parseInt(process.env.IMAP_PORT_1 || '993'),
        user: process.env.IMAP_USER_1,
        password: process.env.IMAP_PASSWORD_1,
        folder: process.env.IMAP_FOLDER_1 || 'INBOX',
        tls: process.env.IMAP_TLS_1 === 'true',
        accountId: 'account1'
      });
    }

    // Load configuration for account 2 (Gmail)
    if (process.env.IMAP_HOST_2 && process.env.IMAP_USER_2 && process.env.IMAP_PASSWORD_2) {
      this.configs.push({
        host: process.env.IMAP_HOST_2,
        port: parseInt(process.env.IMAP_PORT_2 || '993'),
        user: process.env.IMAP_USER_2,
        password: process.env.IMAP_PASSWORD_2,
        folder: process.env.IMAP_FOLDER_2 || 'INBOX',
        tls: process.env.IMAP_TLS_2 === 'true',
        accountId: 'account2'
      });
    }
  }

  public async connectAllAccounts(): Promise<void> {
    if (this.configs.length === 0) {
      console.warn('No IMAP configurations found. Please check your .env file.');
      return;
    }

    console.log(`Attempting to connect to ${this.configs.length} IMAP accounts`);
    const connectionPromises = this.configs.map(config => this.connectAccount(config));
    await Promise.all(connectionPromises);
    this.isReady = true;
    console.log(`Connected to ${this.connections.size} IMAP accounts`);
  }

  private async connectAccount(config: ImapConfig): Promise<void> {
    return new Promise(async (resolve) => {
      console.log(`Setting up IMAP connection for ${config.accountId} (${config.host})`);
      
      // Check for placeholder passwords
      if (config.password && (config.password.includes('your-') || config.password.includes('placeholder'))) {
        console.error(`❌ Invalid password for ${config.accountId}. Please update your .env file with actual credentials.`);
        resolve();
        return;
      }

      const imapConfig: Imap.Config = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        tls: config.tls !== undefined ? config.tls : true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000
      };

      console.log(`IMAP Config for ${config.accountId}:`, {
        host: imapConfig.host,
        port: imapConfig.port,
        user: imapConfig.user,
        tls: imapConfig.tls
      });

      // Special configuration for Gmail
      if (config.host.includes('gmail.com')) {
        imapConfig.tlsOptions = {
          rejectUnauthorized: false
        };
        console.log(`Applied Gmail-specific TLS configuration for ${config.accountId}`);
      }

      const imap = new Imap(imapConfig);

      imap.once('ready', () => {
        console.log(`✅ Connected to IMAP account: ${config.accountId}`);
        this.connections.set(config.accountId, imap);
        
        // Open the mailbox
        console.log(`Opening mailbox ${config.folder} for ${config.accountId}`);
        imap.openBox(config.folder, false, (err, box) => {
          if (err) {
            console.error(`❌ Error opening mailbox for ${config.accountId}:`, err);
            resolve();
            return;
          }
          
          console.log(`✅ Opened mailbox ${config.folder} for ${config.accountId}`);
          
          // Fetch last 30 days of emails
          this.fetchRecentEmails(imap, config);
          
          // Set up IDLE listener for real-time updates
          this.setupIdleListener(imap, config);
          
          resolve();
        });
      });

      imap.once('error', (err: Error) => {
        console.error(`❌ IMAP error for ${config.accountId}:`, err.message);
        resolve();
      });

      imap.once('end', () => {
        console.log(`IMAP connection ended for ${config.accountId}`);
        this.connections.delete(config.accountId);
      });

      imap.once('close', () => {
        console.log(`IMAP connection closed for ${config.accountId}`);
      });

      try {
        console.log(`Connecting to IMAP account ${config.accountId}...`);
        imap.connect();
      } catch (error) {
        console.error(`Failed to connect to IMAP account ${config.accountId}:`, error);
        resolve();
      }
    });
  }

  private fetchRecentEmails(imap: Imap, config: ImapConfig): void {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const searchCriteria = [
      ['SINCE', startDate],
      ['ALL']
    ];

    const fetchOptions = {
      bodies: '',
      struct: true
    };

    console.log(`Searching for emails in the last 30 days for ${config.accountId}`);
    imap.search(searchCriteria, (err, results) => {
      if (err) {
        console.error(`Error searching emails for ${config.accountId}:`, err);
        return;
      }

      if (results.length === 0) {
        console.log(`No emails found in the last 30 days for ${config.accountId}`);
        return;
      }

      console.log(`Found ${results.length} emails in the last 30 days for ${config.accountId}`);

      const f = imap.fetch(results, fetchOptions);
      
      f.on('message', (msg, seqno) => {
        this.processMessage(msg, seqno, config);
      });

      f.once('error', (err) => {
        console.error(`Fetch error for ${config.accountId}:`, err);
      });

      f.once('end', () => {
        console.log(`Finished fetching emails for ${config.accountId}`);
      });
    });
  }

  private setupIdleListener(imap: Imap, config: ImapConfig): void {
    // Implementation for IDLE command will go here
    // This will listen for new emails in real-time
    console.log(`Setting up IDLE listener for ${config.accountId}`);
    
    // We'll implement this in the next step
    // For now, we'll just periodically check for new emails
    setInterval(() => {
      this.checkForNewEmails(imap, config);
    }, 30000); // Check every 30 seconds (in production, we'd use IDLE)
  }

  private checkForNewEmails(imap: Imap, config: ImapConfig): void {
    // This is a placeholder for the IDLE implementation
    console.log(`Checking for new emails for ${config.accountId}`);
    
    // Search for emails from the last 24 hours
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 1);
    
    const searchCriteria = [
      ['SINCE', sinceDate],
      ['ALL']
    ];

    const fetchOptions = {
      bodies: '',
      struct: true
    };

    imap.search(searchCriteria, (err, results) => {
      if (err) {
        console.error(`Error searching for new emails for ${config.accountId}:`, err);
        return;
      }

      if (results.length === 0) {
        return;
      }

      console.log(`Found ${results.length} new emails for ${config.accountId}`);

      const f = imap.fetch(results, fetchOptions);
      
      f.on('message', (msg, seqno) => {
        this.processMessage(msg, seqno, config);
      });

      f.once('error', (err) => {
        console.error(`Fetch error for new emails for ${config.accountId}:`, err);
      });
    });
  }

  private processMessage(msg: Imap.ImapMessage, seqno: number, config: ImapConfig): void {
    let buffer = '';
    
    msg.on('body', (stream, info) => {
      stream.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
      });
      
      stream.once('end', async () => {
        try {
          const parsed = await simpleParser(buffer);
          
          const email: Email = {
            id: `${config.accountId}-${seqno}-${parsed.messageId || Date.now()}`,
            accountId: config.accountId,
            messageId: parsed.messageId || '',
            subject: parsed.subject || '',
            from: parsed.from ? this.formatAddress(parsed.from) : '',
            to: parsed.to ? this.formatAddress(parsed.to) : '',
            date: parsed.date || new Date(),
            body: parsed.text || '',
            folder: config.folder
          };
          
          // Emit the email event for processing
          this.emit('newEmail', email);
        } catch (error) {
          console.error(`Error parsing email for ${config.accountId}:`, error);
        }
      });
    });
    
    msg.once('attributes', (attrs) => {
      // Process email attributes if needed
    });
    
    msg.once('end', () => {
      // Message processing complete
    });
  }

  // Helper method to format email addresses
  private formatAddress(address: any): string {
    if (!address) return '';
    
    // Handle array of addresses
    if (Array.isArray(address)) {
      return address.map(addr => addr.text || '').join(', ');
    }
    
    // Handle single address object
    return address.text || address.toString() || '';
  }

  public disconnectAll(): void {
    console.log('Disconnecting all IMAP accounts...');
    this.connections.forEach((imap, accountId) => {
      try {
        imap.end();
      } catch (error) {
        console.error(`Error disconnecting from ${accountId}:`, error);
      }
    });
    this.connections.clear();
  }
}