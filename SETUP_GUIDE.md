# CraftConnect Setup Guide

This guide will help you set up CraftConnect with all the necessary integrations: Google Cloud AI, Facebook, Shopify, and WhatsApp.

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/microbhuvan/craftconnectf.git
cd craftconnectf

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

#### Backend Environment Setup
Create a `.env` file in the `backend/` directory using the `.env.example` template:

```bash
cd backend
cp .env.example .env
```

Then configure each section:

## 🔧 Required Integrations

### 1. Google Cloud Platform (Required)

#### Setup Steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Speech-to-Text API
   - Vertex AI API
   - Cloud Vision API (for image analysis)

4. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Create service account with these roles:
     - Vertex AI User
     - Speech Client
     - Vision AI User
   - Download JSON key file

5. Update your `.env`:
```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_LOCATION=us-central1
VERTEX_MODEL=gemini-2.0-flash-exp
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 2. MongoDB (Required)

#### Option A: MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get connection string
4. Update `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/craftconnect
```

#### Option B: Local MongoDB
```env
MONGODB_URI=mongodb://localhost:27017/craftconnect
```

### 3. Facebook Integration (Optional)

#### Setup Steps:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Get a Facebook Page:
   - Create a business page if you don't have one
   - Note the Page ID

5. Generate Page Access Token:
   - Go to Graph API Explorer
   - Select your app
   - Generate token with permissions:
     - `pages_manage_posts`
     - `pages_read_engagement`
     - `publish_to_groups` (optional)

6. Update `.env`:
```env
FB_PAGE_ID=your-facebook-page-id
FB_PAGE_ACCESS_TOKEN=your-long-lived-page-access-token
FB_GRAPH_VERSION=v24.0
```

#### Test Facebook Integration:
```bash
# Test from your backend
curl -X GET "http://localhost:8080/api/facebook/health"
```

### 4. Shopify Integration (Optional)

#### Setup Steps:
1. Have a Shopify store (free trial available)
2. Go to Apps and sales channels > Develop apps
3. Create a custom app
4. Configure Admin API scopes:
   - `write_products`
   - `read_products`
   - `write_inventory`
   - `read_inventory`

5. Install the app and get Admin API access token
6. Get your location ID from Shopify admin

7. Update `.env`:
```env
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_your-admin-access-token
SHOPIFY_API_VERSION=2025-10
LOCATION_ID=your-primary-location-id
```

#### Test Shopify Integration:
```bash
# Test from your backend
curl -X GET "http://localhost:8080/api/shopify/health"
```

## 🌐 Deployment

### Backend Deployment (Google Cloud Run)

1. Build and deploy:
```bash
cd backend

# Build Docker image
docker build -t craftconnect-backend .

# Tag for Google Cloud Registry
docker tag craftconnect-backend gcr.io/YOUR-PROJECT-ID/craftconnect-backend

# Push to registry
docker push gcr.io/YOUR-PROJECT-ID/craftconnect-backend

# Deploy to Cloud Run
gcloud run deploy craftconnect-backend \
  --image gcr.io/YOUR-PROJECT-ID/craftconnect-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

2. Set environment variables in Cloud Run console

### Frontend Deployment (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
```env
VITE_API_URL=https://your-backend-url.run.app
```

3. Deploy automatically on push to main branch

## 🧪 Testing the Complete Flow

### 1. Test Core Functionality
```bash
# Start backend
cd backend
npm start

# Start frontend (new terminal)
cd frontend
npm run dev
```

### 2. Test User Journey
1. Go to `http://localhost:5173`
2. Click "Get Started"
3. Complete Business Overview (record audio)
4. Complete Business Summary validation
5. Complete Product Analysis (upload images)
6. Test WhatsApp message generation
7. Test Facebook posting (if configured)
8. Test Shopify publishing (if configured)

### 3. API Health Checks
```bash
# Test all integrations
curl http://localhost:8080/api/facebook/health
curl http://localhost:8080/api/shopify/health

# Test session management
curl http://localhost:8080/api/session/test-session-id
```

## 🔧 Troubleshooting

### Common Issues:

1. **Google Cloud Authentication**:
   - Ensure service account key path is correct
   - Verify APIs are enabled
   - Check service account permissions

2. **Facebook Integration**:
   - Verify page access token is long-lived
   - Check app is added to the Facebook page
   - Ensure correct permissions are granted

3. **Shopify Integration**:
   - Verify admin API access token
   - Check app permissions and scopes
   - Ensure location ID is correct

4. **MongoDB Connection**:
   - Check connection string format
   - Verify network access (whitelist IPs for Atlas)
   - Ensure database user has correct permissions

### Debug Mode:
Set `NODE_ENV=development` for detailed logging

### Logs:
- Backend: Check console output and Cloud Run logs
- Frontend: Check browser developer console

## 📞 WhatsApp Integration Details

WhatsApp integration works by:
1. Generating marketing messages using AI
2. Providing copy-to-clipboard functionality
3. Deep-linking to WhatsApp Web/mobile app
4. Using session data for personalized messages

No WhatsApp API setup required - uses web URLs and clipboard functionality.

## 🎯 Production Checklist

- [ ] All environment variables configured
- [ ] Google Cloud APIs enabled and service account created
- [ ] MongoDB database setup and accessible
- [ ] Facebook app created and page access token obtained (if using Facebook)
- [ ] Shopify custom app created and API access configured (if using Shopify)
- [ ] Backend deployed to Cloud Run with environment variables
- [ ] Frontend deployed to Vercel with API URL configured
- [ ] All health checks passing
- [ ] Complete user flow tested

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Test each integration individually using health checks
4. Check logs in both development and production environments

For additional help, check the individual integration documentation:
- [Google Cloud AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Shopify Admin API Documentation](https://shopify.dev/docs/api/admin-rest)