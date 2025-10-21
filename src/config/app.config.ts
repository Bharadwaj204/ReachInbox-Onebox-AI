export const AppConfig = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
  },
  
  // Elasticsearch configuration
  elasticsearch: {
    host: process.env.ELASTICSEARCH_HOST || process.env.ELASTICSEARCH_URL || 'localhost',
    port: parseInt(process.env.ELASTICSEARCH_PORT || '9201'),
    index: 'emails'
  },
  
  // Gemini API configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  
  // Slack webhook configuration
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  },
  
  // External webhook configuration
  webhook: {
    url: process.env.EXTERNAL_WEBHOOK_URL || '',
  },
  
  // Qdrant configuration
  qdrant: {
    host: process.env.QDRANT_HOST || process.env.QDRANT_URL || 'localhost',
    port: parseInt(process.env.QDRANT_PORT || '6335'),
  }
};