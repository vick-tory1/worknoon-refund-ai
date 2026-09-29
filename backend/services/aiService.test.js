const test = require("node:test");
const assert = require("node:assert/strict");

const { analyzeRefundRequest } = require("./aiService");

test("Gemini analyzes an approved refund request", async () => {
  const result = await analyzeRefundRequest({
    customer: {
      name: "Amara Okafor",
      email: "amara.okafor@example.com",
    },
    order: {
      order_number: "ORD-2026-1048",
      product_name: "AeroSound Wireless Headphones",
      amount: 189,
      order_date: "2026-09-18",
      issue_type: "damaged",
    },
    reason: "The headphones arrived damaged.",
    policyDecision: "APPROVED",
    policyReasons: [
      "The order is eligible because the reported issue is damaged.",
    ],
  });

  assert.equal(result.classification, "ELIGIBLE");
  assert.ok(result.reasoning);
  assert.ok(result.customerResponse);
});