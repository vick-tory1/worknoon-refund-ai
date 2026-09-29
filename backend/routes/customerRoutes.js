const express = require("express");
const db = require("../database/db");

const router = express.Router();

router.get("/", (req, res) => {
  const customers = db
    .prepare(`
      SELECT id, name, email
      FROM customers
      ORDER BY name
    `)
    .all();

  res.json(customers);
});

router.get("/:customerId/orders", (req, res) => {
  const customerId = Number(req.params.customerId);

  if (!Number.isInteger(customerId)) {
    return res.status(400).json({
      error: "Invalid customer ID.",
    });
  }

  const customer = db
    .prepare("SELECT id FROM customers WHERE id = ?")
    .get(customerId);

  if (!customer) {
    return res.status(404).json({
      error: "Customer not found.",
    });
  }

  const orders = db
    .prepare(`
      SELECT
        id,
        order_number,
        product_name,
        amount,
        order_date,
        is_final_sale,
        issue_type
      FROM orders
      WHERE customer_id = ?
      ORDER BY order_date DESC
    `)
    .all(customerId);

  res.json(orders);
});

module.exports = router;
