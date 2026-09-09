import assert from "node:assert/strict";
import {
  COMMAND_OUTCOMES,
  confirmedOutcome,
  isCommandOutcome,
  rejectedOutcome,
  resolveCommandOutcome,
  unknownOutcome,
} from "../src/services/admin/commandOutcome.js";

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
};

console.log("admin command outcome deterministic regression");

check("the public outcome vocabulary is fixed", () => {
  assert.deepEqual(COMMAND_OUTCOMES, ["confirmed", "rejected", "unknown"]);
  assert.equal(Object.isFrozen(COMMAND_OUTCOMES), true);
});

check("confirmed outcomes preserve authoritative values", () => {
  const value = { id: "news-1", revision: 4 };
  assert.deepEqual(confirmedOutcome(value), { outcome: "confirmed", value });
});

check("rejected outcomes carry a code and optional field", () => {
  assert.deepEqual(rejectedOutcome("REVISION_CONFLICT"), {
    outcome: "rejected",
    code: "REVISION_CONFLICT",
  });
  assert.deepEqual(rejectedOutcome("FIELD_INVALID", "title"), {
    outcome: "rejected",
    code: "FIELD_INVALID",
    field: "title",
  });
});

check("unknown outcomes use the non-retryable unverified code", () => {
  assert.deepEqual(unknownOutcome(), {
    outcome: "unknown",
    code: "RESULT_UNVERIFIABLE",
  });
});

check(
  "authoritative confirmation takes precedence over conflicting signals",
  () => {
    assert.deepEqual(
      resolveCommandOutcome({
        confirmed: true,
        rejected: true,
        value: { id: "club-1", revision: 2 },
        rejectionCode: "REQUEST_REJECTED",
      }),
      {
        outcome: "confirmed",
        value: { id: "club-1", revision: 2 },
      },
    );
  },
);

check("authoritative rejection applies only without confirmation", () => {
  assert.deepEqual(
    resolveCommandOutcome({
      confirmed: false,
      rejected: true,
      rejectionCode: "REVISION_CONFLICT",
      field: "revision",
    }),
    {
      outcome: "rejected",
      code: "REVISION_CONFLICT",
      field: "revision",
    },
  );
});

check("missing or malformed authoritative evidence remains unknown", () => {
  assert.deepEqual(resolveCommandOutcome(), unknownOutcome());
  assert.deepEqual(
    resolveCommandOutcome({ confirmed: false, rejected: false }),
    unknownOutcome(),
  );
  assert.deepEqual(
    resolveCommandOutcome({ rejected: true, rejectionCode: "" }),
    unknownOutcome(),
  );
});

check("only complete command outcome shapes are recognized", () => {
  assert.equal(isCommandOutcome(confirmedOutcome(null)), true);
  assert.equal(isCommandOutcome(rejectedOutcome("NOT_ALLOWED")), true);
  assert.equal(isCommandOutcome(unknownOutcome()), true);
  assert.equal(isCommandOutcome({ outcome: "confirmed" }), false);
  assert.equal(isCommandOutcome({ outcome: "rejected", code: "" }), false);
  assert.equal(isCommandOutcome({ outcome: "unknown", code: "OTHER" }), false);
  assert.equal(isCommandOutcome(null), false);
});

console.log(`\n${passed} passed`);
