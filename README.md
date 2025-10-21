# ReachInbox Onebox AI - Email Aggregator

An AI-powered email aggregator that synchronizes emails in real-time, indexes them for search, and categorizes them using Google's Gemini AI. Features include Slack integration, webhook notifications, and AI-powered suggested replies.

## Features

- **Real-time IMAP Email Synchronization** with persistent connections and IDLE command
- **Elasticsearch Email Indexing** with full-text search capabilities
- **AI-Based Email Categorization** using Google Gemini API
- **Slack & Webhook Integration** for Interested emails
- **AI-Powered Suggested Replies** using RAG with Qdrant vector DB
- **Email Threading** to group related emails
- **User Feedback System** to improve AI accuracy
- **Responsive Web UI** to list, search, and manage emails

## Technology Stack

- **Backend**: Node.js with TypeScript
- **Web Framework**: Express.js
- **Email Protocol**: IMAP with node-imap
- **Email Parsing**: mailparser
- **Search Engine**: Elasticsearch
- **AI Engine**: Google Gemini API
- **Vector Database**: Qdrant
- **Frontend**: HTML, CSS, JavaScript
- **Containerization**: Docker

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- Gmail accounts for testing
- Google Gemini API key

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd onebox
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy [.env.example](file:///C:/Users/91939/Desktop/onebox/.env.example) to [.env](file:///C:/Users/91939/Desktop/onebox/.env) and configure your settings:
   ```bash
   cp .env.example .env
   ```

4. Start Docker services:
   ```bash
   docker-compose up -d
   ```

5. Build and start the application:
   ```bash
   npm run build
   npm start
   ```

## Docker Compose Setup (Recommended)

The project includes a comprehensive Docker Compose setup that runs all services together:

1. **Update Environment Variables**:
   Edit the [.env](file:///C:/Users/91939/Desktop/onebox/.env) file with your actual configuration:
   ```env
   # IMAP Configuration
   IMAP_HOST_1=imap.gmail.com
   IMAP_PORT_1=993
   IMAP_USER_1=your-email@gmail.com
   IMAP_PASSWORD_1=your-app-password
   IMAP_FOLDER_1=INBOX
   IMAP_TLS_1=true

   # Add additional IMAP accounts as needed
   IMAP_HOST_2=imap.gmail.com
   IMAP_PORT_2=993
   IMAP_USER_2=your-second-email@gmail.com
   IMAP_PASSWORD_2=your-second-app-password
   IMAP_FOLDER_2=INBOX
   IMAP_TLS_2=true

   # Gemini API Configuration
   GEMINI_API_KEY=your-gemini-api-key

   # Optional Webhook URLs
   SLACK_WEBHOOK_URL=your-slack-webhook-url
   EXTERNAL_WEBHOOK_URL=your-external-webhook-url
   ```

2. **Start All Services**:
   ```bash
   docker-compose up -d
   ```

3. **Access the Application**:
   Open your browser and navigate to `http://localhost:3000`

This Docker Compose setup includes:
- Elasticsearch service for email indexing
- Qdrant service for AI vector storage
- Backend service running the ReachInbox application
- Proper networking between all services
- Volume persistence for data storage

## Project Structure

```
src/
├── config/              # Application configuration
│   └── app.config.ts    # Server, Elasticsearch, Qdrant configs
├── controllers/         # Route handlers
│   └── email.controller.ts # Email search and retrieval
├── routes/              # API route definitions
│   └── email.routes.ts  # Email API endpoints
├── services/            # Business logic modules
│   ├── ai.service.ts          # AI classification with Gemini
│   ├── elasticsearch.service.ts # Email indexing and search
│   ├── imap.service.ts        # Real-time email sync via IMAP
│   ├── qdrant.service.ts      # Vector DB operations
│   ├── rag.service.ts         # Suggested reply generation
│   ├── scheduled.processor.ts # Scheduled email processing
│   └── webhook.service.ts     # Slack/external notifications
├── types/               # TypeScript interfaces and types
│   └── email.types.ts   # Email interfaces and enums
└── server.ts            # Entry point

public/
└── index.html           # Frontend UI

.env                     # Environment variables
.env.example             # Example environment variables
docker-compose.yml       # Docker services configuration
package.json             # Project dependencies and scripts
tsconfig.json            # TypeScript configuration
```

## API Endpoints

### Email Endpoints

- `GET /api/emails/accounts` - Get configured email accounts
- `GET /api/emails/search` - Search emails with filters
- `GET /api/emails/:id` - Get email by ID
- `POST /api/emails/:id/suggest-reply` - Generate AI suggested reply
- `POST /api/emails/:id/feedback` - Submit user feedback for AI correction
- `GET /api/emails/ai/stats` - Get AI feedback statistics

## Environment Variables

### IMAP Configuration

For Gmail accounts, you need to enable IMAP access and use app passwords:

```
# Gmail account 1
IMAP_HOST_1=imap.gmail.com
IMAP_PORT_1=993
IMAP_USER_1=your-email@gmail.com
IMAP_PASSWORD_1=your-app-password
IMAP_FOLDER_1=INBOX
IMAP_TLS_1=true

# Gmail account 2
IMAP_HOST_2=imap.gmail.com
IMAP_PORT_2=993
IMAP_USER_2=your-second-email@gmail.com
IMAP_PASSWORD_2=your-second-app-password
IMAP_FOLDER_2=INBOX
IMAP_TLS_2=true
```

### Elasticsearch Configuration

```
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9201
```

### Qdrant Configuration

```
QDRANT_HOST=localhost
QDRANT_PORT=6335
```

### Gemini API Configuration

```
GEMINI_API_KEY=your-gemini-api-key
```

### Webhook Configuration (Optional)

```
SLACK_WEBHOOK_URL=your-slack-webhook-url
EXTERNAL_WEBHOOK_URL=your-external-webhook-url
```

## Usage

1. **Start Docker Services**:
   ```bash
   docker-compose up -d
   ```

2. **Build and Start Application**:
   ```bash
   npm run build
   npm start
   ```

3. **Access the Application**:
   Open your browser and navigate to `http://localhost:3000`

4. **Email Synchronization**:
   - The application connects to configured IMAP accounts
   - Emails from the last 30 days are fetched initially
   - Real-time updates are received via IMAP IDLE

5. **Email Categorization**:
   - Emails are automatically categorized by AI into:
     - Interested
     - Meeting Booked
     - Not Interested
     - Spam
     - Out of Office
   - Confidence scores and reasoning are provided
   - Users can provide feedback to improve accuracy

6. **Search and Filter**:
   - Search by keywords in subject or body
   - Filter by folder, account, category, date range
   - Filter by confidence level and thread status

7. **AI Features**:
   - View AI-generated email summaries
   - Get AI-powered suggested replies
   - Provide feedback on AI categorizations

## Troubleshooting

1. **IMAP Connection Issues**:
   - Ensure IMAP is enabled in your Gmail settings
   - Use app passwords instead of regular passwords
   - Check firewall and network connectivity

2. **Docker Service Issues**:
   - Ensure Docker is running
   - Check if ports 9201 and 6335 are available
   - Restart Docker services if needed

3. **AI Categorization Issues**:
   - Verify your Gemini API key is valid
   - Check for rate limiting (free tier limitations)
   - Provide feedback to improve accuracy

4. **Search Issues**:
   - Ensure Elasticsearch is running
   - Check connection settings in [.env](file:///C:/Users/91939/Desktop/onebox/.env)
   - Restart the application after configuration changes

## Development

1. **Development Mode**:
   ```bash
   npm run dev
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

3. **Linting**:
   ```bash
   npm run lint
   ```

## Security Considerations

- Store [.env](file:///C:/Users/91939/Desktop/onebox/.env) file securely and never commit to version control
- Use app passwords for Gmail accounts instead of regular passwords
- Regularly rotate API keys and credentials
- Monitor rate limits for external services

## Deployment

### GitHub Repository

To push the code to GitHub:

1. Create a new repository on GitHub
2. Add the remote origin:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   ```
3. Push the code:
   ```bash
   git branch -M main
   git push -u origin main
   ```

### Hosting Options

This application can be deployed to several hosting platforms:

#### Heroku (Recommended)

1. Create a Heroku account and install the Heroku CLI
2. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Set environment variables in Heroku dashboard or using CLI:
   ```bash
   heroku config:set IMAP_HOST_1=imap.gmail.com
   heroku config:set IMAP_PORT_1=993
   # ... set all other environment variables
   ```
4. Deploy the application:
   ```bash
   git push heroku main
   ```

#### Render Deployment

Render is a unified cloud platform that makes it easy to build and run all your apps and websites with free TLS certificates, a global CDN, DDoS protection, private networks, and auto-deploys from Git.

##### Prerequisites

1. Create a Render account at [render.com](https://render.com)
2. Connect your GitHub account to Render
3. Set up managed services for Elasticsearch and Qdrant (see below)

##### Deployment Steps

1. **Prepare External Services**:
   - For Elasticsearch, sign up for [Elastic Cloud](https://cloud.elastic.co/) or use another managed service
   - For Qdrant, sign up for [Qdrant Cloud](https://qdrant.tech/cloud/) or use another managed service

2. **Fork or Push Your Repository**:
   - Fork this repository to your GitHub account or push it to a new GitHub repository

3. **Deploy to Render**:
   - Go to your Render Dashboard
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - Name: `reachinbox-onebox-ai`
     - Environment: `Node`
     - Build Command: `npm run build`
     - Start Command: `npm start`
     - Instance Type: `Starter` (or higher for production)

4. **Configure Environment Variables**:
   In the Render dashboard, go to your service settings and add all environment variables from your [.env](file:///C:/Users/91939/Desktop/onebox/.env) file:
   - `IMAP_HOST_1`, `IMAP_PORT_1`, `IMAP_USER_1`, `IMAP_PASSWORD_1`, etc.
   - `ELASTICSEARCH_HOST` and `ELASTICSEARCH_PORT` (from your managed service)
   - `QDRANT_HOST` and `QDRANT_PORT` (from your managed service)
   - `GEMINI_API_KEY`
   - Optional: `SLACK_WEBHOOK_URL`, `EXTERNAL_WEBHOOK_URL`

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - The application will be available at `https://your-app-name.onrender.com`

##### Important Render Configuration

Render automatically sets the `PORT` environment variable, which your application already respects.

For persistent connections to work properly on Render:
- Use the "Starter" tier or higher (free tier may restart your application periodically)
- Consider adding a cron job to periodically check and re-establish IMAP connections if needed

##### Environment Variables on Render

Render allows you to set environment variables in the dashboard:
1. Go to your service in the Render dashboard
2. Click "Environment" in the sidebar
3. Add each variable from your [.env](file:///C:/Users/91939/Desktop/onebox/.env) file with the appropriate values
4. Make sure to use the connection details for your managed Elasticsearch and Qdrant services

#### Important Notes for Deployment

1. **External Services**: This application requires Elasticsearch and Qdrant services. You'll need to:
   - Use managed services (Elastic Cloud, Qdrant Cloud) or
   - Self-host these services on separate servers

2. **Persistent Connections**: The application maintains persistent IMAP connections which may not work well with some hosting platforms that restart applications frequently.

3. **Environment Variables**: Never commit your [.env](file:///C:/Users/91939/Desktop/onebox/.env) file to version control. Always use the hosting platform's environment variable configuration.

For detailed deployment instructions, see [DEPLOYMENT.md](file:///C:/Users/91939/Desktop/onebox/DEPLOYMENT.md).