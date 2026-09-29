const express = require("express");
const db = require("../database/db");
const { processRefundRequest } = require("../services/refundService");

const router = express.Router();

router.get("/", (req, res) => {
  const refunds = db
    .prepare(`
      SELECT
        rr.id,
        rr.reason,
        rr.requested_amount,
        rr.decision,
        rr.policy_reasons,
        rr.ai_classification,
        rr.ai_response,
        rr.created_at,
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        o.id AS order_id,
        o.order_number,
        o.product_name,
        o.amount AS order_amount,
        o.order_date,
        o.issue_type
      FROM refund_requests rr
      JOIN customers c ON c.id = rr.customer_id
      JOIN orders o ON o.id = rr.order_id
      ORDER BY rr.created_at DESC
    `)
    .all();

  const result = refunds.map((refund) => ({
    ...refund,
    policy_reasons: JSON.parse(refund.policy_reasons),
  }));

  res.json(result);
});

router.get("/:refundId", (req, res) => {
  const refundId = Number(req.params.refundId);

  if (!Number.isInteger(refundId)) {
    return res.status(400).json({
      error: "Invalid refund ID.",
    });
  }

  const refund = db
    .prepare(`
      SELECT
        rr.id,
        rr.reason,
        rr.requested_amount,
        rr.decision,
        rr.policy_reasons,
        rr.ai_classification,
        rr.ai_response,
        rr.created_at,
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        o.id AS order_id,
        o.order_number,
        o.product_name,
        o.amount AS order_amount,
        o.order_date,
        o.issue_type
      FROM refund_requests rr
      JOIN customers c ON c.id = rr.customer_id
      JOIN orders o ON o.id = rr.order_id
      WHERE rr.id = ?
    `)
    .get(refundId);

  if (!refund) {
    return res.status(404).json({
      error: "Refund request not found.",
    });
  }

  const auditLogs = db
    .prepare(`
      SELECT
        id,
        event_type,
        details,
        created_at
      FROM audit_logs
      WHERE refund_request_id = ?
      ORDER BY id
    `)
    .all(refundId);

  res.json({
    ...refund,
    policy_reasons: JSON.parse(refund.policy_reasons),
    audit_logs: auditLogs.map((log) => ({
      ...log,
      details: JSON.parse(log.details),
    })),
  });
});

router.post("/", async (req, res) => {
  try {
    const {
      customerId,
      orderId,
      reason,
      requestedAmount,
      isSuspicious,
      hasConflictingInformation,
    } = req.body;

    const result = await processRefundRequest({
      customerId,
      orderId,
      reason,
      requestedAmount,
      isSuspicious,
      hasConflictingInformation,
    });

    res.status(201).json(result);
  } catch (error) {
    const status = error.status;

    if (status === 500 || status === 503) {
      return res.status(503).json({
        error: "The refund service is temporarily unavailable. Please try again.",
      });
    }

    res.status(400).json({
      error: error.message,
    });
  }
});

module.exports = router;