# Production Environment Variables Configuration
# Copy this file and set all variables in your Cloud Run and Vercel environments

# ===== CLOUD RUN BACKEND ENVIRONMENT VARIABLES =====

# Core Application
NODE_ENV=production
PORT=8080
CLIENT_URL=https://craftconnectf.vercel.app

# MongoDB Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/craftconnect?retryWrites=true&w=majority

# Google Cloud Services
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_LOCATION=us-central1
VERTEX_MODEL=gemini-2.5-flash
# Note: Do NOT set GOOGLE_APPLICATION_CREDENTIALS in Cloud Run - use service account instead

# Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Facebook Page Integration
FB_PAGE_ID=889189190938089
FB_PAGE_ACCESS_TOKEN=EAArimXRbV9sBP0XqH63cIRaEMzZABTHP19CdzTVqPmRJVi4bhrUBVcDYZALdMDMIXyqL6OaLIrXYkcgMxxhk1EnzjdiOybbih4FGhcpjNCl95wW9WtaaXzLAcNtZBSjTrlBiC1ZB7XsyZAZAr3Yln0rcB1rRTq8ZBTCVNlhtXyL4UG3B6FyMZBQehBeoNT8laCmVmGB0ZCotuKuIAMcf6FgcZCwRMQnlfa4mcsI89nmnMZD
FB_GRAPH_VERSION=v24.0

# Shopify Integration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_your-shopify-admin-access-token
SHOPIFY_API_VERSION=2025-10
LOCATION_ID=your-shopify-location-id

# Internal API Base (for session management)
INTERNAL_BASE_URL=http://localhost:8080

# ===== VERCEL FRONTEND ENVIRONMENT VARIABLES =====

# API Connection
VITE_API_URL=https://your-cloud-run-service.run.app

# ===== GOOGLE CLOUD SERVICE ACCOUNT PERMISSIONS =====
# Ensure your Cloud Run service account has these roles:
# - Vertex AI User
# - Cloud Speech Client  
# - Cloud Vision API User
# - Cloud Run Service Agent (default)
# - Service Account Token Creator (if needed)

# ===== REQUIRED GOOGLE CLOUD APIs =====
# Enable these APIs in your Google Cloud project:
# - Cloud Speech-to-Text API
# - Vertex AI API
# - Cloud Vision API
# - Cloud Run API
# - Cloud Build API (if using cloudbuild.yaml)

# ===== DEPLOYMENT CHECKLIST =====
# □ Set all Cloud Run environment variables above
# □ Set VITE_API_URL in Vercel
# □ Verify Google Cloud service account permissions
# □ Enable required Google Cloud APIs
# □ Test MongoDB connection from Cloud Run
# □ Test Cloudinary upload and public URL access
# □ Verify Facebook Page token is not expired
# □ Test Shopify store connection and product creation
# □ Set up Cloud Build trigger (if using cloudbuild.yaml)

# ===== TESTING ENDPOINTS =====
# After deployment, test these endpoints:
# GET https://your-cloud-run-service.run.app/health
# GET https://your-cloud-run-service.run.app/api/facebook/health
# GET https://your-cloud-run-service.run.app/api/shopify/health
