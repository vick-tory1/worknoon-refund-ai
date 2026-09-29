const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../database/db");
const aiService = require("./aiService");
const { GEMINI_MODELS, generateWithFallback } = require("./aiService");
const {
  AI_UNAVAILABLE_CUSTOMER_MESSAGE,
  AI_UNAVAILABLE_INTERNAL_REASON,
  processRefundRequest,
} = require("./refundService");

const originalAnalyzeRefundRequest = aiService.analyzeRefundRequest;

test.after(() => {
  aiService.analyzeRefundRequest = originalAnalyzeRefundRequest;
});

test("processes an eligible refund and creates an audit log", async () => {
  aiService.analyzeRefundRequest = async () => ({
    classification: "ELIGIBLE",
    reasoning: "The request meets the policy requirements.",
    customerResponse: "Your refund request has been received.",
  });

  const result = await processRefundRequest({
    customerId: 1,
    orderId: 1,
    reason: "The headphones arrived damaged.",
    requestedAmount: 189,
  });

  assert.equal(result.decision, "APPROVED");
  assert.equal(result.requestedAmount, 189);
  assert.ok(result.id);

  const refund = db
    .prepare("SELECT * FROM refund_requests WHERE id = ?")
    .get(result.id);

  const audit = db
    .prepare("SELECT * FROM audit_logs WHERE refund_request_id = ?")
    .get(result.id);

  assert.equal(refund.decision, "APPROVED");
  assert.equal(audit.event_type, "POLICY_EVALUATION");
});

test("rejects an order that does not belong to the customer", async () => {
  await assert.rejects(
    processRefundRequest({
        customerId: 1,
        orderId: 3,
        reason: "I want a refund.",
        requestedAmount: 100,
      }),
    {
      message: "Order not found for this customer.",
    }
  );
});

test("rejects a refund above the order amount", async () => {
  await assert.rejects(
    processRefundRequest({
        customerId: 1,
        orderId: 1,
        reason: "The item arrived damaged.",
        requestedAmount: 200,
      }),
    {
      message: "Requested amount cannot exceed the order amount.",
    }
  );
});

test("escalates and audits a request when AI assistance is unavailable", async () => {
  aiService.analyzeRefundRequest = async () => {
    throw new Error("RESOURCE_EXHAUSTED");
  };

  const result = await processRefundRequest({
    customerId: 1,
    orderId: 1,
    reason: "The headphones arrived damaged.",
    requestedAmount: 189,
  });

  const auditLog = db
    .prepare("SELECT event_type FROM audit_logs WHERE refund_request_id = ? AND event_type = ?")
    .get(result.id, "AI_UNAVAILABLE");

  assert.equal(result.decision, "ESCALATED");
  assert.equal(result.ai.classification, "NEEDS_HUMAN_REVIEW");
  assert.equal(result.aiUnavailable, true);
  assert.equal(result.ai.customerResponse, AI_UNAVAILABLE_CUSTOMER_MESSAGE);
  assert.ok(result.reasons.includes(AI_UNAVAILABLE_INTERNAL_REASON));
  assert.equal(auditLog.event_type, "AI_UNAVAILABLE");
});

test("escalates when the configured Gemini model returns a 429 quota error", async () => {
  const modelAttempts = [];
  const quotaExhaustedClient = {
    models: {
      generateContent: async ({ model }) => {
        modelAttempts.push(model);
        const error = new Error("RESOURCE_EXHAUSTED: quota exceeded");
        error.status = 429;
        throw error;
      },
    },
  };

  aiService.analyzeRefundRequest = async () =>
    generateWithFallback("test prompt", quotaExhaustedClient);

  const result = await processRefundRequest({
    customerId: 1,
    orderId: 1,
    reason: "The headphones arrived damaged.",
    requestedAmount: 189,
  });

  const auditLog = db
    .prepare("SELECT event_type FROM audit_logs WHERE refund_request_id = ? AND event_type = ?")
    .get(result.id, "AI_UNAVAILABLE");

  assert.deepEqual(modelAttempts, GEMINI_MODELS);
  assert.equal(result.decision, "ESCALATED");
  assert.equal(result.ai.classification, "NEEDS_HUMAN_REVIEW");
  assert.equal(result.aiUnavailable, true);
  assert.equal(result.ai.customerResponse, AI_UNAVAILABLE_CUSTOMER_MESSAGE);
  assert.doesNotMatch(result.ai.customerResponse, /resource_exhausted|quota|429/i);
  assert.equal(auditLog.event_type, "AI_UNAVAILABLE");
});
