const test = require("node:test");
const assert = require("node:assert/strict");

const { evaluateRefundPolicy } = require("./refundPolicy");

function createOrder(overrides = {}) {
  return {
    is_final_sale: 0,
    order_date: new Date().toISOString().split("T")[0],
    issue_type: null,
    ...overrides,
  };
}

test("denies final-sale orders", () => {
  const result = evaluateRefundPolicy({
    order: createOrder({ is_final_sale: 1 }),
    requestedAmount: 100,
  });

  assert.equal(result.decision, "DENIED");
});

test("denies orders outside the refund window", () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 31);

  const result = evaluateRefundPolicy({
    order: createOrder({
      order_date: oldDate.toISOString().split("T")[0],
    }),
    requestedAmount: 100,
  });

  assert.equal(result.decision, "DENIED");
});

test("escalates suspicious requests", () => {
  const result = evaluateRefundPolicy({
    order: createOrder(),
    requestedAmount: 100,
    isSuspicious: true,
  });

  assert.equal(result.decision, "ESCALATED");
});

test("escalates refunds above $500", () => {
  const result = evaluateRefundPolicy({
    order: createOrder(),
    requestedAmount: 501,
  });

  assert.equal(result.decision, "ESCALATED");
});

test("approves damaged items within the refund window", () => {
  const result = evaluateRefundPolicy({
    order: createOrder({ issue_type: "damaged" }),
    requestedAmount: 200,
  });

  assert.equal(result.decision, "APPROVED");
});

test("approves incorrect items within the refund window", () => {
  const result = evaluateRefundPolicy({
    order: createOrder({ issue_type: "incorrect_item" }),
    requestedAmount: 200,
  });

  assert.equal(result.decision, "APPROVED");
});