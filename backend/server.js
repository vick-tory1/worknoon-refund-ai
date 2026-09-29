const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const refundRoutes = require("./routes/refundRoutes");
const customerRoutes = require("./routes/customerRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/refunds", refundRoutes);
app.use("/api/customers", customerRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Worknoon Refund AI API",
    demoAiMode: process.env.DEMO_AI_MODE === "true",
  });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
