# Step-by-Step Guide to Deploy ReachInbox Onebox AI on Render

This guide provides detailed instructions for deploying the ReachInbox Onebox AI application to Render with cloud services for Elasticsearch and Qdrant.

## Prerequisites

Before you begin, ensure you have:

1. A Render account (sign up at [render.com](https://render.com))
2. A GitHub account
3. An Elastic Cloud account (sign up at [cloud.elastic.co](https://cloud.elastic.co/))
4. A Qdrant Cloud account (sign up at [qdrant.tech/cloud](https://qdrant.tech/cloud/))
5. A Google Cloud account with Gemini API access

## Step 1: Set Up Cloud Services

### 1.1 Elasticsearch Cloud Setup

1. Go to [Elastic Cloud](https://cloud.elastic.co/) and sign in or create an account
2. Click "Create Deployment"
3. Choose a cloud provider and region
4. Select a template (I/O Optimized is recommended for production)
5. Set a deployment name (e.g., "reachinbox-elasticsearch")
6. Set a password for the "elastic" user and save it securely
7. Click "Create Deployment"
8. Wait for the deployment to be created (this may take several minutes)
9. Once created, navigate to your deployment overview
10. Note down the following information:
    - **Cloud ID**: Found in the deployment overview (you'll need this for Render environment variables)
    - **Username**: Usually "elastic"
    - **Password**: The password you set during creation

### 1.2 Qdrant Cloud Setup

1. Go to [Qdrant Cloud](https://qdrant.tech/cloud/) and sign in or create an account
2. Click "Create Cluster"
3. Choose a cloud provider and region
4. Select a plan (Starter is sufficient for testing)
5. Set a cluster name (e.g., "reachinbox-qdrant")
6. Click "Create Cluster"
7. Wait for the cluster to be created (this may take several minutes)
8. Once created, navigate to your cluster details
9. Note down the following information:
    - **Cluster URL**: The endpoint URL (e.g., https://xxxxxxxxxxx.cloud.qdrant.io)
    - **API Key**: Generate a new API key or use an existing one

### 1.3 Google Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API key" in the "API Key" section
4. Create a new API key or use an existing one
5. Save the API key securely (you'll need this for Render environment variables)

## Step 2: Prepare Your Repository

### 2.1 Fork or Clone the Repository

If you haven't already, fork or clone the ReachInbox Onebox AI repository:

1. Go to the [ReachInbox Onebox AI GitHub repository](https://github.com/Bharadwaj204/ReachInbox-Onebox-AI)
2. Click the "Fork" button to create your own copy
3. Clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ReachInbox-Onebox-AI.git
   cd ReachInbox-Onebox-AI
   ```

### 2.2 Verify Configuration Files

Ensure the following files exist and are properly configured:
- [package.json](file:///C:/Users/91939/Desktop/onebox/package.json) - Contains build and start scripts
- [render.yaml](file:///C:/Users/91939/Desktop/onebox/render.yaml) - Defines Render deployment configuration
- [Dockerfile](file:///C:/Users/91939/Desktop/onebox/Dockerfile) - Defines Docker image build process
- [docker-compose.yml](file:///C:/Users/91939/Desktop/onebox/docker-compose.yml) - Defines local development services

## Step 3: Deploy to Render

### 3.1 Connect Render to GitHub

1. Sign in to your Render account
2. Click "New +" and select "Web Service"
3. Click "Connect account" next to GitHub
4. Authorize Render to access your GitHub repositories
5. Select the repository you want to deploy (your fork of ReachInbox Onebox AI)

### 3.2 Configure the Web Service

Fill in the following information:

- **Name**: `reachinbox-onebox-ai`
- **Region**: Choose the region closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty (root of repository)
- **Environment**: `Node`
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`

### 3.3 Configure Environment Variables

In the "Environment Variables" section, add the following variables:

#### IMAP Configuration (Required)
```env
IMAP_HOST_1=imap.gmail.com
IMAP_PORT_1=993
IMAP_USER_1=your-email-1@gmail.com
IMAP_PASS_1=your-app-password-1
IMAP_FOLDER_1=INBOX
IMAP_TLS_1=true
```

Note: For Gmail, you'll need to generate an App Password:
1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Factor Authentication if not already enabled
4. Generate an App Password for "Mail"
5. Use this App Password as `IMAP_PASS_1`

#### Elasticsearch Configuration (Required)
```env
ELASTICSEARCH_CLOUD_ID=your-cloud-id-from-elastic-cloud
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-elastic-password
```

#### Qdrant Configuration (Required)
```env
QDRANT_HOST=your-cluster-id.cloud.qdrant.io
QDRANT_PORT=6333
QDRANT_API_KEY=your-qdrant-api-key
```

#### Gemini API Configuration (Required)
```env
GEMINI_API_KEY=your-google-gemini-api-key
```

#### Optional Webhook Configurations
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EXTERNAL_WEBHOOK_URL=https://your-external-service.com/webhook
```

### 3.4 Advanced Configuration

In the "Advanced" section:

1. Set Health Check Path to `/health`
2. Set Health Check Interval to `30` seconds

### 3.5 Create Web Service

Click "Create Web Service" to begin the deployment process.

## Step 4: Monitor Deployment

1. Render will automatically start building your application
2. You can monitor the build process in the "Build Logs" tab
3. Once the build is complete, Render will start your application
4. Monitor the startup process in the "Logs" tab
5. The application will be available at `https://your-app-name.onrender.com`

## Step 5: Verify Deployment

### 5.1 Check Application Health

1. Visit your application URL: `https://your-app-name.onrender.com/health`
2. You should see a JSON response indicating the application status:
   ```json
   {
     "status": "OK",
     "timestamp": "2023-XX-XXTXX:XX:XX.XXXZ",
     "services": {
       "imap": "initialized",
       "elasticsearch": "connected",
       "qdrant": "initialized"
     }
   }
   ```

### 5.2 Test Email Processing

1. Send a test email to the email account configured in your IMAP settings
2. Check the application logs in Render to verify the email is processed
3. Verify that the email appears in your Elasticsearch index

## Step 6: Configure Auto-Deploy (Optional)

To automatically deploy changes when you push to your GitHub repository:

1. In your Render dashboard, go to your web service
2. Click "Settings"
3. Scroll to "Auto-Deploy"
4. Select "Yes" for "Auto-Deploy"

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Failures
- **Issue**: Build fails with dependency errors
- **Solution**: Ensure all dependencies in [package.json](file:///C:/Users/91939/Desktop/onebox/package.json) are correct and compatible

#### 2. Application Crashes on Startup
- **Issue**: Application crashes with connection errors
- **Solution**: Verify all environment variables are correctly set, especially cloud service credentials

#### 3. IMAP Connection Failures
- **Issue**: Application cannot connect to email servers
- **Solution**: Verify IMAP credentials and ensure App Passwords are used for Gmail

#### 4. Elasticsearch Connection Failures
- **Issue**: Application cannot connect to Elasticsearch
- **Solution**: Verify Cloud ID, username, and password are correct

#### 5. Qdrant Connection Failures
- **Issue**: Application cannot connect to Qdrant
- **Solution**: Verify cluster URL and API key are correct

### Checking Logs

To troubleshoot issues:

1. In your Render dashboard, go to your web service
2. Click "Logs" to view real-time application logs
3. Look for error messages that indicate the source of the problem
4. Check the "Build Logs" tab if the issue occurs during the build process

## Scaling and Performance

### Instance Types

Render offers several instance types:

- **Free**: Limited resources, periodic restarts
- **Starter**: Basic resources for small applications
- **Standard**: Balanced resources for medium applications
- **Pro**: High-performance resources for large applications

For production use, consider using at least the "Starter" tier.

### Custom Domains

To use a custom domain:

1. In your Render dashboard, go to your web service
2. Click "Settings"
3. Scroll to "Custom Domains"
4. Add your domain name
5. Follow the instructions to configure DNS records with your domain provider

Render automatically provides SSL certificates for custom domains.

## Maintenance

### Updating Your Application

To update your application:

1. Make changes to your code and push to your GitHub repository
2. If auto-deploy is enabled, Render will automatically deploy the changes
3. If auto-deploy is disabled, manually trigger a deploy in the Render dashboard

### Monitoring

Regularly check:

1. Application logs for errors
2. Resource usage in the Render dashboard
3. Email processing success rates
4. Connection status to external services

## Conclusion

You've successfully deployed the ReachInbox Onebox AI application to Render with cloud services for Elasticsearch and Qdrant. Your application is now accessible via HTTPS and will automatically scale based on demand.

For any issues or questions, refer to the main [DEPLOYMENT.md](file:///C:/Users/91939/Desktop/onebox/DEPLOYMENT.md) file or consult the Render documentation.