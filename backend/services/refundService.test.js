const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../database/db");
const { processRefundRequest } = require("./refundService");

test("processes an eligible refund and creates an audit log", () => {
  const result = processRefundRequest({
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

test("rejects an order that does not belong to the customer", () => {
  assert.throws(
    () =>
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

test("rejects a refund above the order amount", () => {
  assert.throws(
    () =>
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
