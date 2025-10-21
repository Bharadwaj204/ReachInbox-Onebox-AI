import axios from 'axios';
import { Email } from '../types/email.types';
import { AppConfig } from '../config/app.config';

export class WebhookService {
  
  public async sendSlackNotification(email: Email): Promise<void> {
    if (!AppConfig.slack.webhookUrl) {
      console.warn('Slack webhook URL not configured');
      return;
    }

    try {
      const payload = {
        text: `New Interested Email Alert!`,
        attachments: [
          {
            color: 'good',
            fields: [
              {
                title: 'Subject',
                value: email.subject,
                short: false
              },
              {
                title: 'From',
                value: email.from,
                short: true
              },
              {
                title: 'Date',
                value: email.date.toISOString(),
                short: true
              }
            ]
          }
        ]
      };

      await axios.post(AppConfig.slack.webhookUrl, payload);
      console.log('Slack notification sent for interested email');
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }

  public async sendExternalWebhook(email: Email): Promise<void> {
    if (!AppConfig.webhook.url) {
      console.warn('External webhook URL not configured');
      return;
    }

    try {
      // Send the full email data to the external webhook
      await axios.post(AppConfig.webhook.url, email);
      console.log('External webhook notification sent for interested email');
    } catch (error) {
      console.error('Error sending external webhook notification:', error);
    }
  }
}