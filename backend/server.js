// Load environment first
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

// Initialize app
const app = express();

// Core middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Log basic env sanity (avoid printing secrets)
console.log("ENV check:", {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 8080,
  CLIENT_URL: process.env.CLIENT_URL,
  GOOGLE_PROJECT_ID: !!process.env.GOOGLE_PROJECT_ID,
  SHOPIFY_CONFIGURED:
    !!process.env.SHOPIFY_STORE_DOMAIN && !!process.env.SHOPIFY_ADMIN_TOKEN,
  FACEBOOK_CONFIGURED:
    !!process.env.FB_PAGE_ID && !!process.env.FB_PAGE_ACCESS_TOKEN,
});

// Health
app.get("/", (_req, res) => res.status(200).send("Backend is running!"));

// Mount API routes
const apiRoutes = require("./src/routes/api");
app.use("/api", apiRoutes);

// Mount Shopify routes only if configured (prevents startup crash)
try {
  const shopifyConfigured =
    process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN;
  if (shopifyConfigured) {
    const shopifyRoutes = require("./src/routes/shopify");
    app.use("/api/shopify", shopifyRoutes);
    console.log("Shopify routes mounted.");
  } else {
    app.get("/api/shopify/health", (_req, res) =>
      res.status(503).json({ ok: false, error: "Shopify not configured" })
    );
    console.warn("Shopify not configured. Skipping route mount.");
  }
} catch (e) {
  console.error("Failed to mount Shopify routes:", e.message);
}

// Mount Facebook routes only if configured
try {
  const fbConfigured =
    process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN;
  if (fbConfigured) {
    const facebookRoutes = require("./src/routes/facebook");
    app.use("/api/facebook", facebookRoutes);
    console.log("Facebook routes mounted.");
  } else {
    app.get("/api/facebook/health", (_req, res) =>
      res.status(503).json({ ok: false, error: "Facebook not configured" })
    );
    console.warn("Facebook not configured. Skipping route mount.");
  }
} catch (e) {
  console.error("Failed to mount Facebook routes:", e.message);
}

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

// Start server
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
