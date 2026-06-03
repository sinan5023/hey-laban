const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Routes
const authApi = require("./Routes/auth.api");
const catalogueApi = require("./Routes/Catalogue.api");
const salesSessionApi = require("./Routes/SalesSession.api")
const ordersApi = require("./Routes/orders.api")
const searchApi = require("./Routes/search.api")
// Global error handlong middleware
const errorHandler = require("./middlewares/globalErrorHandler.middleware")

dotenv.config();
const app = express();

//Global Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.0.0.2:3000"],
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

//global error handler 
app.use(errorHandler)







app.listen(8000, () => {
  console.log("The Server Is Up And Running");
});
