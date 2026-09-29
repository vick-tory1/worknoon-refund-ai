const db = require("../database/db");
const { evaluateRefundPolicy } = require("../policy/refundPolicy");
const aiService = require("./aiService");

const AI_UNAVAILABLE_CUSTOMER_MESSAGE =
  "Your request has been received, but it can't be approved right now. It has been escalated to the appropriate team. We will have someone reach out to you as soon as possible.";
const AI_UNAVAILABLE_INTERNAL_REASON =
  "AI assistance is unavailable because the configured Gemini model could not respond.";

function buildCustomerResponse({ orderNumber, decision, reasons, aiUnavailable }) {
  if (aiUnavailable) {
    return AI_UNAVAILABLE_CUSTOMER_MESSAGE;
  }

  const safeOrderNumber = String(orderNumber || "your order").trim();
  const decisionLabel = decision[0] + decision.slice(1).toLowerCase();
  const reason = reasons.join(" ");
  const acknowledgement = `We received your refund request for order ${safeOrderNumber}. Decision: ${decisionLabel}.`;

  if (decision === "ESCALATED") {
    return `${acknowledgement} Human review is required because ${reason} A support specialist will review your request. Next step: wait for the specialist's follow-up.`;
  }

  if (decision === "APPROVED") {
    return `${acknowledgement} Reason: ${reason} Next step: we will process the refund to the original payment method.`;
  }

  return `${acknowledgement} Reason: ${reason} Next step: no refund will be issued; contact support with your order number if you need help.`;
}

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

  let decision = policyResult.decision;
  let reasons = policyResult.reasons;
  let aiUnavailable = false;
  let aiResult;

  try {
    aiResult = await aiService.analyzeRefundRequest({
      customer,
      order,
      reason: reason.trim(),
      policyDecision: policyResult.decision,
      policyReasons: policyResult.reasons,
    });
  } catch (_error) {
    // Provider details are never persisted or returned to the customer.
    decision = "ESCALATED";
    reasons = [
      ...policyResult.reasons,
      AI_UNAVAILABLE_INTERNAL_REASON,
    ];
    aiUnavailable = true;
    aiResult = {
      classification: "NEEDS_HUMAN_REVIEW",
      reasoning:
        "AI assistance was unavailable, so the request was escalated for human review.",
      customerResponse: AI_UNAVAILABLE_CUSTOMER_MESSAGE,
    };
  }

  const expectedClassification = {
    APPROVED: "ELIGIBLE",
    DENIED: "INELIGIBLE",
    ESCALATED: "NEEDS_HUMAN_REVIEW",
  }[decision];

  const aiClassification = aiUnavailable
    ? expectedClassification
    : aiResult.classification === expectedClassification
      ? aiResult.classification
      : expectedClassification;

  const customerResponse = buildCustomerResponse({
    orderNumber: order.order_number,
    decision,
    reasons,
    aiUnavailable,
  });

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
      decision,
      JSON.stringify(reasons),
      aiClassification,
      customerResponse
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

    if (aiUnavailable) {
      insertAudit.run(
        refundRequestId,
        "AI_UNAVAILABLE",
        JSON.stringify({
          outcome: "ESCALATED_FOR_HUMAN_REVIEW",
          reason: AI_UNAVAILABLE_INTERNAL_REASON,
        })
      );
    }

    insertAudit.run(
      refundRequestId,
      "AI_ANALYSIS",
      JSON.stringify({
        classification: aiClassification,
        reasoning: aiResult.reasoning,
        customerResponse,
      })
    );

    return refundRequestId;
  });

  const refundRequestId = saveRefund();

  return {
    id: refundRequestId,
    customer,
    order,
    decision,
    reasons,
    requestedAmount,
    aiUnavailable,
    ai: {
      classification: aiClassification,
      reasoning: aiResult.reasoning,
      customerResponse,
    },
  };
}

module.exports = {
  AI_UNAVAILABLE_CUSTOMER_MESSAGE,
  AI_UNAVAILABLE_INTERNAL_REASON,
  processRefundRequest,
};
