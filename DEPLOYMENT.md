# Deployment Guide

## Prerequisites

1. A Heroku account (for Heroku deployment)
2. A Render account (for Render deployment)
3. A GitHub account
4. Access to managed Elasticsearch and Qdrant services (or self-hosted instances)

## Deployment Steps

### 1. Prepare Environment Variables

Before deploying, you'll need to configure the following environment variables in your deployment platform:

```env
# IMAP Configuration
IMAP_HOST_1=imap.gmail.com
IMAP_PORT_1=993
IMAP_USER_1=your-email@gmail.com
IMAP_PASSWORD_1=your-app-password
IMAP_FOLDER_1=INBOX
IMAP_TLS_1=true

IMAP_HOST_2=imap.gmail.com
IMAP_PORT_2=993
IMAP_USER_2=your-second-email@gmail.com
IMAP_PASSWORD_2=your-second-app-password
IMAP_FOLDER_2=INBOX
IMAP_TLS_2=true

# Elasticsearch Configuration (use managed service)
ELASTICSEARCH_HOST=your-elasticsearch-host
ELASTICSEARCH_PORT=9200

# Qdrant Configuration (use managed service)
QDRANT_HOST=your-qdrant-host
QDRANT_PORT=6333

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key

# Optional Webhook URLs
SLACK_WEBHOOK_URL=your-slack-webhook-url
EXTERNAL_WEBHOOK_URL=your-external-webhook-url
```

### 2. Deploy to Heroku using Git

1. Install the Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Log in to Heroku CLI:
   ```bash
   heroku login
   ```
3. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
4. Set environment variables:
   ```bash
   heroku config:set IMAP_HOST_1=imap.gmail.com
   heroku config:set IMAP_PORT_1=993
   # ... set all other environment variables
   ```
5. Deploy the application:
   ```bash
   git push heroku main
   ```

### 3. Alternative: Deploy using Heroku Container Registry (for Docker)

If you prefer to use Docker:

1. Log in to Heroku Container Registry:
   ```bash
   heroku container:login
   ```
2. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Push the Docker image:
   ```bash
   heroku container:push web
   ```
4. Release the image:
   ```bash
   heroku container:release web
   ```

### 4. Deploy to Render

Render is a unified cloud platform that makes it easy to build and run all your apps and websites with free TLS certificates, a global CDN, DDoS protection, private networks, and auto-deploys from Git.

#### Prerequisites for Render

1. Create a Render account at [render.com](https://render.com)
2. Connect your GitHub account to Render
3. Set up managed services for Elasticsearch and Qdrant (see below)

#### Deployment Steps for Render

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
   In the Render dashboard, go to your service settings and add all environment variables:
   - `IMAP_HOST_1`, `IMAP_PORT_1`, `IMAP_USER_1`, `IMAP_PASSWORD_1`, etc.
   - `ELASTICSEARCH_HOST` and `ELASTICSEARCH_PORT` (from your managed service)
   - `QDRANT_HOST` and `QDRANT_PORT` (from your managed service)
   - `GEMINI_API_KEY`
   - Optional: `SLACK_WEBHOOK_URL`, `EXTERNAL_WEBHOOK_URL`

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - The application will be available at `https://your-app-name.onrender.com`

## Render-Specific Configuration

### Environment Variables on Render

Render allows you to set environment variables in the dashboard:
1. Go to your service in the Render dashboard
2. Click "Environment" in the sidebar
3. Add each variable from your [.env](file:///C:/Users/91939/Desktop/onebox/.env) file with the appropriate values
4. Make sure to use the connection details for your managed Elasticsearch and Qdrant services

### Important Render Configuration

Render automatically sets the `PORT` environment variable, which your application already respects.

For persistent connections to work properly on Render:
- Use the "Starter" tier or higher (free tier may restart your application periodically)
- Consider adding a cron job to periodically check and re-establish IMAP connections if needed

### Render Service Configuration

Your application includes a [render.yaml](file:///C:/Users/91939/Desktop/onebox/render.yaml) file that defines the service configuration:

```yaml
services:
  - type: web
    name: reachinbox-onebox-ai
    env: node
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: PORT
        value: 3000
```

This configuration tells Render how to build and run your application.

### Auto-Deploy with Render

Render automatically deploys your application when you push changes to your connected GitHub repository. To set this up:

1. Connect your GitHub repository to Render
2. Configure auto-deploy in the Render dashboard
3. Any push to the main branch will trigger a new deployment

### Custom Domain on Render

To use a custom domain with your Render application:

1. In the Render dashboard, go to your service settings
2. Click "Settings" then "Custom Domains"
3. Add your domain name
4. Follow the instructions to configure DNS records with your domain provider

### SSL Certificates

Render automatically provides free SSL certificates for all services with custom domains. No additional configuration is needed.

## External Services Setup

### Elasticsearch
You can use:
1. Elastic Cloud (https://cloud.elastic.co/)
2. AWS Elasticsearch Service
3. Self-hosted Elasticsearch

### Qdrant
You can use:
1. Qdrant Cloud (https://qdrant.tech/cloud/)
2. Self-hosted Qdrant

## Notes

1. The application requires persistent connections to email servers, which may not work well with Render's ephemeral filesystem.
2. Consider using a more suitable hosting platform for long-running applications with persistent connections.
3. The free tier of Google Gemini API has rate limits that may affect email processing speed.

## Production Deployment

For production deployment, you have several options:

### Option 1: Docker Deployment (Recommended)

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Create a Docker image**:
   ```dockerfile
   FROM node:20-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY dist ./dist
   COPY public ./public
   COPY .env ./
   
   EXPOSE 3000
   
   CMD ["node", "dist/server.js"]
   ```

3. **Update docker-compose.yml** to include your application:
   ```yaml
   version: '3.8'
   
   services:
     elasticsearch:
       # ... existing configuration ...
     
     kibana:
       # ... existing configuration ...
     
     qdrant:
       # ... existing configuration ...
     
     reachinbox:
       build: .
       ports:
         - "3000:3000"
       depends_on:
         - elasticsearch
         - qdrant
       environment:
         - ELASTICSEARCH_HOST=elasticsearch
         - QDRANT_HOST=qdrant
   ```

### Option 2: Cloud Deployment

#### AWS Deployment
1. Use AWS Elastic Beanstalk for simple deployment
2. Use Amazon Elasticsearch Service for managed Elasticsearch
3. Use EC2 instances for Qdrant or consider managed alternatives

#### Google Cloud Deployment
1. Use Google Cloud Run for containerized deployment
2. Use Google Cloud Elasticsearch for managed service
3. Use Compute Engine for Qdrant

#### Azure Deployment
1. Use Azure App Service for application hosting
2. Use Azure Cognitive Search as an Elasticsearch alternative
3. Use Virtual Machines for Qdrant

### Option 3: Traditional Deployment

1. **Provision a server** (Ubuntu 20.04+ recommended)
2. **Install dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Deploy the application**:
   ```bash
   # Clone or copy your application
   git clone <your-repo> reachinbox
   cd reachinbox
   
   # Install dependencies
   npm ci
   
   # Build the application
   npm run build
   
   # Start services
   docker-compose up -d
   
   # Start the application
   npm start
   ```

4. **Set up reverse proxy** (optional but recommended):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Environment Configuration

### Production Environment Variables

Create a [.env.production](file:///C:/Users/91939/Desktop/onebox/.env.production) file with production values:

```env
# IMAP Configuration
IMAP_HOST_1=imap.yourcompany.com
IMAP_PORT_1=993
IMAP_USER_1=service-account@yourcompany.com
IMAP_PASSWORD_1=your-production-password
IMAP_FOLDER_1=INBOX

# Elasticsearch Configuration
ELASTICSEARCH_HOST=your-production-elasticsearch-host
ELASTICSEARCH_PORT=9200

# Gemini API Configuration
GEMINI_API_KEY=your-production-api-key

# Slack Webhook Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/PRODUCTION/WEBHOOK

# External Webhook Configuration
EXTERNAL_WEBHOOK_URL=https://your-internal-system.com/webhook

# Qdrant Configuration
QDRANT_HOST=your-production-qdrant-host
QDRANT_PORT=6333

# Server Configuration
PORT=3000
```

## Monitoring and Logging

### Application Monitoring

1. **Add application monitoring**:
   ```bash
   npm install winston
   ```

2. **Implement structured logging** in your services:
   ```typescript
   import winston from 'winston';
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' })
     ]
   });
   ```

### Infrastructure Monitoring

1. **Use Docker health checks**:
   ```yaml
   services:
     reachinbox:
       # ... other configuration
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

2. **Set up log aggregation** with ELK stack or similar

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing**: Use NGINX, HAProxy, or cloud load balancers
2. **Session Management**: Use Redis for session storage if needed
3. **Database Connection Pooling**: Configure appropriate pool sizes

### Vertical Scaling

1. **Resource Allocation**: 
   - CPU: Minimum 2 cores
   - Memory: Minimum 4GB RAM
   - Storage: Depends on email volume

### Database Optimization

1. **Elasticsearch**:
   - Configure appropriate shard and replica settings
   - Set up index lifecycle management
   - Monitor heap usage

2. **Qdrant**:
   - Configure appropriate memory limits
   - Set up backups

## Security Considerations

### Network Security

1. **Firewall Configuration**:
   - Allow only necessary ports (22, 80, 443, 9200 for internal access)
   - Restrict Elasticsearch access to internal network only

2. **TLS/SSL**:
   - Use Let's Encrypt for free SSL certificates
   - Configure HTTPS for all external communication

### Application Security

1. **Environment Variables**:
   - Never commit sensitive values to version control
   - Use secret management solutions (HashiCorp Vault, AWS Secrets Manager, etc.)

2. **API Security**:
   - Implement rate limiting
   - Add authentication for sensitive endpoints
   - Validate all inputs

### Data Security

1. **Encryption**:
   - Encrypt data at rest
   - Use TLS for data in transit

2. **Backups**:
   - Implement regular backup procedures
   - Test backup restoration procedures

## Backup and Recovery

### Backup Strategy

1. **Application Code**: Use version control (Git)
2. **Configuration**: Backup environment files securely
3. **Data**:
   - Elasticsearch snapshots: `curl -X PUT "localhost:9200/_snapshot/my_backup/snapshot_1?wait_for_completion=true"`
   - Qdrant snapshots: Use Qdrant's snapshot API

### Recovery Plan

1. **Disaster Recovery**:
   - Document recovery procedures
   - Regularly test recovery processes
   - Maintain offsite backups

2. **Rollback Procedures**:
   - Tag Docker images with version numbers
   - Maintain database migration scripts
   - Document rollback steps

## Maintenance

### Regular Maintenance Tasks

1. **System Updates**:
   - Regular OS updates
   - Security patching
   - Dependency updates

2. **Performance Monitoring**:
   - Monitor resource usage
   - Review database queries
   - Optimize configurations

3. **Capacity Planning**:
   - Monitor storage usage
   - Plan for growth
   - Scale resources as needed

## Troubleshooting

### Common Issues

1. **Connection Failures**:
   - Check network connectivity
   - Verify service status
   - Review firewall rules

2. **Performance Issues**:
   - Check resource utilization
   - Review database queries
   - Optimize configurations

3. **Data Issues**:
   - Verify data integrity
   - Check backup status
   - Review error logs

### Support

For production issues, contact your system administrator or DevOps team. For application issues, refer to the logs and error messages for specific details.