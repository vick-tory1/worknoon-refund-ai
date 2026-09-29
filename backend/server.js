const express = require("express");
const cors = require("cors");
require("dotenv").config();

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
  });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
