const db = require("../database/db");
const { evaluateRefundPolicy } = require("../policy/refundPolicy");
const { analyzeRefundRequest } = require("./aiService");

async function processRefundRequest({
  customerId,
  orderId,
  reason,
  requestedAmount,
  isSuspicious = false,
  hasConflictingInformation = false,
}) {
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(customerId);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND customer_id = ?")
    .get(orderId, customerId);

  if (!order) {
    throw new Error("Order not found for this customer.");
  }

  if (!reason || typeof reason !== "string") {
    throw new Error("Refund reason is required.");
  }

  if (
    typeof requestedAmount !== "number" ||
    requestedAmount <= 0
  ) {
    throw new Error("Requested amount must be greater than zero.");
  }

  if (requestedAmount > order.amount) {
    throw new Error("Requested amount cannot exceed the order amount.");
  }

  const policyResult = evaluateRefundPolicy({
    order,
    requestedAmount,
    isSuspicious,
    hasConflictingInformation,
  });

  const aiResult = await analyzeRefundRequest({
    customer,
    order,
    reason: reason.trim(),
    policyDecision: policyResult.decision,
    policyReasons: policyResult.reasons,
  });

  const expectedClassification = {
    APPROVED: "ELIGIBLE",
    DENIED: "INELIGIBLE",
    ESCALATED: "NEEDS_HUMAN_REVIEW",
  }[policyResult.decision];

  const aiClassification =
    aiResult.classification === expectedClassification
      ? aiResult.classification
      : expectedClassification;

  const saveRefund = db.transaction(() => {
    const insertRefund = db.prepare(`
      INSERT INTO refund_requests (
        customer_id,
        order_id,
        reason,
        requested_amount,
        decision,
        policy_reasons,
        ai_classification,
        ai_response
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const refundResult = insertRefund.run(
      customerId,
      orderId,
      reason.trim(),
      requestedAmount,
      policyResult.decision,
      JSON.stringify(policyResult.reasons),
      aiClassification,
      aiResult.customerResponse
    );

    const refundRequestId = refundResult.lastInsertRowid;

    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (
        refund_request_id,
        event_type,
        details
      )
      VALUES (?, ?, ?)
    `);

    insertAudit.run(
      refundRequestId,
      "POLICY_EVALUATION",
      JSON.stringify({
        decision: policyResult.decision,
        reasons: policyResult.reasons,
      })
    );

    insertAudit.run(
      refundRequestId,
      "AI_ANALYSIS",
      JSON.stringify({
        classification: aiClassification,
        reasoning: aiResult.reasoning,
        customerResponse: aiResult.customerResponse,
      })
    );

    return refundRequestId;
  });

  const refundRequestId = saveRefund();

  return {
    id: refundRequestId,
    customer,
    order,
    decision: policyResult.decision,
    reasons: policyResult.reasons,
    requestedAmount,
    ai: {
      classification: aiClassification,
      reasoning: aiResult.reasoning,
      customerResponse: aiResult.customerResponse,
    },
  };
}

module.exports = {
  processRefundRequest,
};