const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GEMINI_MODELS,
  analyzeRefundRequest,
  generateWithFallback,
  generateWithTimeout,
} = require("./aiService");

test("demo AI mode returns policy-aligned results without calling Gemini", async () => {
  const originalDemoMode = process.env.DEMO_AI_MODE;
  process.env.DEMO_AI_MODE = "true";

  try {
    const request = {
      order: {},
      reason: "Test request",
      policyReasons: [],
    };

    const approved = await analyzeRefundRequest({
      ...request,
      policyDecision: "APPROVED",
    });
    const denied = await analyzeRefundRequest({
      ...request,
      policyDecision: "DENIED",
    });
    const escalated = await analyzeRefundRequest({
      ...request,
      policyDecision: "ESCALATED",
    });

    assert.equal(approved.classification, "ELIGIBLE");
    assert.equal(denied.classification, "INELIGIBLE");
    assert.equal(escalated.classification, "NEEDS_HUMAN_REVIEW");
  } finally {
    if (originalDemoMode === undefined) {
      delete process.env.DEMO_AI_MODE;
    } else {
      process.env.DEMO_AI_MODE = originalDemoMode;
    }
  }
});

test("uses the primary Gemini model when it succeeds", async () => {
  const calls = [];
  const client = {
    models: {
      generateContent: async ({ model }) => {
        calls.push(model);
        return { text: "{}" };
      },
    },
  };

  const response = await generateWithFallback("test prompt", client);

  assert.equal(response.text, "{}");
  assert.deepEqual(calls, [GEMINI_MODELS[0]]);
});

test("does not retry another model after a Gemini 429 response", async () => {
  const calls = [];
  const client = {
    models: {
      generateContent: async ({ model }) => {
        calls.push(model);
        const error = new Error("RESOURCE_EXHAUSTED");
        error.status = 429;
        throw error;
      },
    },
  };

  await assert.rejects(generateWithFallback("test prompt", client));
  assert.deepEqual(calls, GEMINI_MODELS);
});

test("fails only after every configured Gemini model is unavailable", async () => {
  const calls = [];
  const client = {
    models: {
      generateContent: async ({ model }) => {
        calls.push(model);
        throw new Error("service unavailable");
      },
    },
  };

  await assert.rejects(generateWithFallback("test prompt", client));
  assert.deepEqual(calls, GEMINI_MODELS);
});

test("does not retry for quota, 500, 503, or unavailable failures", async () => {
  const fallbackErrors = [
    Object.assign(new Error("quota exceeded"), { status: 429 }),
    Object.assign(new Error("internal error"), { status: 500 }),
    Object.assign(new Error("service unavailable"), { status: 503 }),
    new Error("service unavailable"),
  ];

  for (const error of fallbackErrors) {
    const calls = [];
    const client = {
      models: {
        generateContent: async ({ model }) => {
          calls.push(model);
          throw error;
        },
      },
    };

    await assert.rejects(generateWithFallback("test prompt", client));
    assert.deepEqual(calls, GEMINI_MODELS);
  }
});

test("does not retry after a model request times out", async () => {
  const calls = [];
  const client = {
    models: {
      generateContent: ({ model }) => {
        calls.push(model);
        return new Promise(() => {});
      },
    },
  };

  await assert.rejects(generateWithTimeout(client, GEMINI_MODELS[0], "test prompt", 1), {
    code: "AI_TIMEOUT",
  });

  const unavailableClient = {
    models: {
      generateContent: async ({ model }) => {
        calls.push(model);
        const error = new Error("AI request timed out.");
        error.code = "AI_TIMEOUT";
        throw error;
      },
    },
  };
  await assert.rejects(generateWithFallback("test prompt", unavailableClient));
  assert.deepEqual(calls, [GEMINI_MODELS[0], ...GEMINI_MODELS]);
});
