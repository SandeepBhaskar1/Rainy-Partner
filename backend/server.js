const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const plumberRoutes = require("./routes/plumber");
const leadsRoutes = require("./routes/leads");
const adminRoutes = require("./routes/admin");
const coordinatorRoute = require('./routes/coordinator');
const generalRoutes = require("./routes/general");
const projectRoute = require("./routes/picture");
const userRoute = require("./routes/userRegister");
const kycRoutes = require("./routes/kycs");

const { errorHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/logger");
const fileUpload = require("express-fileupload");

const app = express();
app.set("trust proxy", 1);
app.use(cookieParser());
  
app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: true,
    useTempFiles: false,
    debug: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());

const allowedOrigins = new Set([
  "http://localhost:8081",
      "exp://s14wb3g-anonymous-8081.exp.direct",
      "http://localhost:5173",
      'http://192.168.1.41:5173',
      "http://172.20.10.2:5173",
      "exp://10.34.196.196:8081",
]);

app.use(
  cors({
    origin: (origin, callback) => {
       console.log('🔍 Request origin:', origin);
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS policy violation: Origin not allowed -> ` + origin),  console.log('❌ Origin not allowed:', origin));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ]
  })
);
app.options("*", cors());

app.get("/", (req, res) => {
  res.send("Welcome to the Rainy Partner API");
});

app.use("/api", projectRoute);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(morgan("combined"));
app.use(requestLogger);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/coordinator", coordinatorRoute)
app.use("/api", generalRoutes);

app.use("/api/onboarding", userRoute);
app.use("/api/profile", userRoute);

app.use("/api/plumber", plumberRoutes);

app.use("/api/post-leads", leadsRoutes);

app.use("/api/kyc", kycRoutes);

app.use("/api/orders", require("./routes/orders"));

app.get("/api/health", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? "connected" : "disconnected";

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionsInfo = {};

    for (const collection of collections) {
      const count = await mongoose.connection.db
        .collection(collection.name)
        .countDocuments();
      collectionsInfo[collection.name] = {
        documents: count,
        status: "connected",
      };
    }

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        s3: "available",
      },
      database: {
        type: "MongoDB",
        name: process.env.DB_NAME,
        collections: collectionsInfo,
        total_collections: collections.length,
        node_env: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(errorHandler);

app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

mongoose.connection.on("error", (error) => {
  console.error("MongoDB error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 8001;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://192.168.1.41:${PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
