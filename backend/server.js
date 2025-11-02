const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

// Derived env
const NODE_ENV = process.env.NODE_ENV || "development";
const CLIENT_URL = process.env.CLIENT_URL || "*"; // e.g. https://craftconnectf.vercel.app

// Security & logging
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// CORS for production frontend
const corsOptions = {
  origin: (origin, cb) => {
    // Allow no Origin (mobile apps, curl) and the configured client
    if (!origin) return cb(null, true);
    const allowed = Array.isArray(CLIENT_URL) ? CLIENT_URL : [CLIENT_URL];
    if (allowed.includes("*") || allowed.some(u => origin === u)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin ${origin}`));
  },
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true,
  maxAge: 86400,
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health endpoint (pre-DB)
app.get("/health", (_req, res) => res.status(200).json({ ok: true, env: NODE_ENV }));

// Routes
const apiRoutes = require("./src/routes/api");

// Mongoose tuning
mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", true);

const PORT = Number(process.env.PORT) || 8080;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: "majority",
      tls: true,
    });
    console.log("✅ MongoDB connected");

    app.get("/", (_req, res) => res.status(200).send("Backend is running!"));
    app.use("/api", apiRoutes);

    app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT} (env=${NODE_ENV})`));
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
})();
