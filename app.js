const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Routes
const authApi = require("./Routes/auth.api");
const catalogueApi = require("./Routes/items.api");
const salesSessionApi = require("./Routes/salesSession.api")
const ordersApi = require("./Routes/orders.api")
const searchApi = require("./Routes/search.api")
const profileApi = require("./Routes/profile.api")
const reportsApi = require("./Routes/reports.api")
// Global error handlong middleware
const errorHandler = require("./middlewares/globalErrorHandler.middleware")

dotenv.config();
const app = express();

//Global Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.enable('trust proxy')
app.use(
  cors({
    origin: ["http://localhost:3000","https://2l3t23t3-3000.inc1.devtunnels.ms"],
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

//global error handler 
app.use(errorHandler)







app.listen(8000, () => {
  console.log("The Server Is Up And Running");
});
