const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../database/db");
const aiService = require("../services/aiService");
const {
  AI_UNAVAILABLE_CUSTOMER_MESSAGE,
  AI_UNAVAILABLE_INTERNAL_REASON,
} = require("../services/refundService");
const refundRoutes = require("./refundRoutes");

const originalAnalyzeRefundRequest = aiService.analyzeRefundRequest;

test.after(() => {
  aiService.analyzeRefundRequest = originalAnalyzeRefundRequest;
});

test("POST /api/refunds persists an escalation when the configured Gemini model fails", async () => {
  aiService.analyzeRefundRequest = async () => {
    throw new Error("RESOURCE_EXHAUSTED");
  };

  const app = express();
  app.use(express.json());
  app.use("/api/refunds", refundRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/refunds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: 1,
        orderId: 1,
        reason: "The headphones arrived damaged.",
        requestedAmount: 189,
      }),
    });
    const body = await response.json();
    const auditLog = db
      .prepare("SELECT event_type FROM audit_logs WHERE refund_request_id = ? AND event_type = ?")
      .get(body.id, "AI_UNAVAILABLE");

    assert.equal(response.status, 201);
    assert.equal(body.decision, "ESCALATED");
    assert.equal(body.ai.classification, "NEEDS_HUMAN_REVIEW");
    assert.equal(body.aiUnavailable, true);
    assert.equal(body.ai.customerResponse, AI_UNAVAILABLE_CUSTOMER_MESSAGE);
    assert.ok(body.reasons.includes(AI_UNAVAILABLE_INTERNAL_REASON));
    assert.equal(auditLog.event_type, "AI_UNAVAILABLE");

    const listResponse = await fetch(`http://127.0.0.1:${port}/api/refunds`);
    const refunds = await listResponse.json();
    const detailResponse = await fetch(`http://127.0.0.1:${port}/api/refunds/${body.id}`);
    const detail = await detailResponse.json();

    assert.equal(listResponse.status, 200);
    assert.ok(refunds.some((refund) => refund.id === body.id && refund.decision === "ESCALATED"));
    assert.equal(detailResponse.status, 200);
    assert.ok(detail.audit_logs.some((log) => log.event_type === "AI_UNAVAILABLE"));
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
