const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const sequelize = require("./src/config/dbConnection");
const path = require("path");
const http = require("http");
const applyAssociations = require("./src/associations");
applyAssociations();

const app = express();
const server = http.createServer(app);

app.set("trust proxy", true);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      if (req.originalUrl && req.originalUrl.startsWith("/booking/payment-webhook")) {
        req.rawBody = buf.toString("utf8");
      }
    },
  })
);
app.use(express.static("Public"));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  })
);

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

app.get("/", (req, res) => {
  res.send("Welcome to Warehouse Backend");
});

try {
  require("./src/config/routeRegistry")(app);
} catch (error) {
  console.error("Error loading route registry:", error);
}

app.use(express.static("public"));
app.use("/profileImage", express.static(path.join(__dirname, "public/profileImage")));
app.use("/public", express.static(path.join(__dirname, "public")));

sequelize
  .authenticate()
  .then(async () => {
    await sequelize.sync();
    console.log("Connected to database");

    server.listen(process.env.PORT, () => {
      console.log(
        `Server started at port ${process.env.PORT}`
      );
    });
  })
  .catch((err) => {
    console.error("Unable to connect to database:", err);
  });

  
