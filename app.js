const express = require("express");
let app = express();

try {
  const dotenv = require("dotenv");
  const cookieParser = require("cookie-parser");
  const cors = require("cors");

  // Routes
  const authApi = require("./routes/auth.api");
  const catalogueApi = require("./routes/items.api");
  const salesSessionApi = require("./routes/salesSession.api")
  const ordersApi = require("./routes/orders.api")
  const searchApi = require("./routes/search.api")
  const profileApi = require("./routes/profile.api")
  const reportsApi = require("./routes/reports.api")
  const inventoryApi = require("./routes/inventory.api")
  const rawMaterialApi = require("./routes/raw-material.api")
  // Global error handlong middleware
  const errorHandler = require("./middlewares/globalErrorHandler.middleware")

  dotenv.config();

  //Global Middlewares
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true }));
  app.enable('trust proxy')
  const devOrigins = process.env.NODE_ENV !== "production" 
    ? ["http://localhost:3000","http://192.0.0.2:3000"] 
    : [];

  app.use(
    cors({
      origin: [...devOrigins, process.env.FRONTEND_URL].filter(Boolean),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
      ],
    }),
  );

  //APIS

  app.use("/api", catalogueApi);
  app.use("/api/auth", authApi);
  app.use("/api/sales-session",salesSessionApi)
  app.use("/api/orders",ordersApi)
  app.use("/api/search",searchApi)
  app.use("/api/profile",profileApi)
  app.use("/api/reports",reportsApi)
  app.use("/api/inventory",inventoryApi)
  app.use("/api/raw-materials",rawMaterialApi)

  //global error handler 
  app.use(errorHandler)

} catch (error) {
  console.error("FATAL BOOT ERROR:", error);
  // Serve the error directly so you can see it in the browser
  app.all("*", (req, res) => {
    res.status(500).json({
      success: false,
      message: "FATAL BOOT ERROR",
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
  });
}

module.exports = app;