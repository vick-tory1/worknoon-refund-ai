const REFUND_WINDOW_DAYS = 30;
const HUMAN_REVIEW_THRESHOLD = 500;

function evaluateRefundPolicy({
  order,
  requestedAmount,
  isSuspicious = false,
  hasConflictingInformation = false,
}) {
  const reasons = [];

  if (order.is_final_sale) {
    return {
      decision: "DENIED",
      reasons: ["This order contains a final-sale item."],
    };
  }

  const orderDate = new Date(order.order_date);
  const today = new Date();
  const ageInDays = Math.floor(
    (today - orderDate) / (1000 * 60 * 60 * 24)
  );

  if (ageInDays > REFUND_WINDOW_DAYS) {
    return {
      decision: "DENIED",
      reasons: [
        `The order is ${ageInDays} days old and is outside the ${REFUND_WINDOW_DAYS}-day refund window.`,
      ],
    };
  }

  if (isSuspicious || hasConflictingInformation) {
    return {
      decision: "ESCALATED",
      reasons: [
        "The request contains suspicious or conflicting information and requires human review.",
      ],
    };
  }

  if (requestedAmount > HUMAN_REVIEW_THRESHOLD) {
    return {
      decision: "ESCALATED",
      reasons: [
        `The requested refund of $${requestedAmount.toFixed(
          2
        )} exceeds the $${HUMAN_REVIEW_THRESHOLD} human-review threshold.`,
      ],
    };
  }

  if (
    order.issue_type === "damaged" ||
    order.issue_type === "incorrect_item"
  ) {
    return {
      decision: "APPROVED",
      reasons: [
        `The order is eligible because the reported issue is ${order.issue_type.replace(
          "_",
          " "
        )}.`,
      ],
    };
  }

  return {
    decision: "APPROVED",
    reasons: ["The order meets the standard refund eligibility requirements."],
  };
}

module.exports = {
  evaluateRefundPolicy,
};