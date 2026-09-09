export const COMMAND_OUTCOMES = Object.freeze([
  "confirmed",
  "rejected",
  "unknown",
]);

const UNKNOWN_CODE = "RESULT_UNVERIFIABLE";

export function confirmedOutcome(value) {
  return Object.freeze({ outcome: "confirmed", value });
}

export function rejectedOutcome(code, field) {
  if (typeof code !== "string" || code.length === 0) {
    throw new TypeError("A rejected command outcome requires a code.");
  }

  const outcome = { outcome: "rejected", code };
  if (typeof field === "string" && field.length > 0) outcome.field = field;
  return Object.freeze(outcome);
}

export function unknownOutcome() {
  return Object.freeze({
    outcome: "unknown",
    code: UNKNOWN_CODE,
  });
}

export function resolveCommandOutcome(evidence = {}) {
  if (evidence?.confirmed === true) return confirmedOutcome(evidence.value);

  if (
    evidence?.rejected === true &&
    typeof evidence.rejectionCode === "string" &&
    evidence.rejectionCode.length > 0
  ) {
    return rejectedOutcome(evidence.rejectionCode, evidence.field);
  }

  return unknownOutcome();
}

export function isCommandOutcome(candidate) {
  if (!candidate || typeof candidate !== "object") return false;

  if (candidate.outcome === "confirmed") {
    return Object.hasOwn(candidate, "value");
  }

  if (candidate.outcome === "rejected") {
    return (
      typeof candidate.code === "string" &&
      candidate.code.length > 0 &&
      (!Object.hasOwn(candidate, "field") ||
        (typeof candidate.field === "string" && candidate.field.length > 0))
    );
  }

  return candidate.outcome === "unknown" && candidate.code === UNKNOWN_CODE;
}
