import { LAYOUT_STYLES, type LayoutStyle } from "../layout/types";
import { containsForbidden, sanitizeReviewText } from "./forbidden";
import { REVIEW_TOPICS, type OpsReview, type ReviewAlternative, type ReviewComparisonRow, type ReviewFinding, type ReviewTopic } from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseFinding(value: unknown): ReviewFinding | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as { topic?: unknown; message?: unknown };
  if (!REVIEW_TOPICS.includes(raw.topic as ReviewTopic)) {
    return null;
  }
  const message = sanitizeReviewText(asString(raw.message)).slice(0, 220);
  if (!message || containsForbidden(message)) {
    return null;
  }
  return { topic: raw.topic as ReviewTopic, message };
}

function parseComparison(value: unknown): ReviewComparisonRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as { aspect?: unknown; current?: unknown; alternative?: unknown };
  const aspect = sanitizeReviewText(asString(raw.aspect)).slice(0, 40);
  const current = sanitizeReviewText(asString(raw.current)).slice(0, 40);
  const alternative = sanitizeReviewText(asString(raw.alternative)).slice(0, 40);
  if (!aspect || !current || !alternative) {
    return null;
  }
  if (containsForbidden(aspect) || containsForbidden(current) || containsForbidden(alternative)) {
    return null;
  }
  return { aspect, current, alternative };
}

function parseAlternative(
  raw: {
    suggestAlternative?: unknown;
    alternativeStyle?: unknown;
    currentProblem?: unknown;
    alternativeReason?: unknown;
  },
  currentStyle: LayoutStyle,
): ReviewAlternative | null {
  if (raw.suggestAlternative !== true) {
    return null;
  }
  const style = raw.alternativeStyle;
  if (!LAYOUT_STYLES.includes(style as LayoutStyle) || style === currentStyle) {
    return null;
  }
  const currentProblem = sanitizeReviewText(asString(raw.currentProblem)).slice(0, 180);
  const reason = sanitizeReviewText(asString(raw.alternativeReason)).slice(0, 220);
  if (!currentProblem || !reason || containsForbidden(currentProblem) || containsForbidden(reason)) {
    return null;
  }
  return { style: style as LayoutStyle, currentProblem, reason };
}

export function parseOpsReview(value: unknown, currentStyle: LayoutStyle): OpsReview | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as {
    findings?: unknown;
    suggestAlternative?: unknown;
    alternativeStyle?: unknown;
    currentProblem?: unknown;
    alternativeReason?: unknown;
    comparison?: unknown;
    alternative?: unknown;
    alternativeApplied?: unknown;
    fromStyle?: unknown;
  };

  const findings: ReviewFinding[] = [];
  const findingSource = Array.isArray(raw.findings) ? raw.findings : [];
  for (const item of findingSource) {
    const parsed = parseFinding(item);
    if (parsed) {
      findings.push(parsed);
    }
    if (findings.length >= 6) {
      break;
    }
  }

  if (findings.length === 0) {
    return null;
  }

  const fromStyle = LAYOUT_STYLES.includes(raw.fromStyle as LayoutStyle)
    ? (raw.fromStyle as LayoutStyle)
    : currentStyle;
  const alternativeApplied = raw.alternativeApplied === true;

  const alternative =
    raw.alternative && typeof raw.alternative === "object"
      ? parseAlternative(
          {
            suggestAlternative: true,
            alternativeStyle: (raw.alternative as ReviewAlternative).style,
            currentProblem: (raw.alternative as ReviewAlternative).currentProblem,
            alternativeReason: (raw.alternative as ReviewAlternative).reason,
          },
          fromStyle,
        )
      : parseAlternative(raw, fromStyle);

  const comparison: ReviewComparisonRow[] = [];
  if ((alternative || alternativeApplied) && Array.isArray(raw.comparison)) {
    for (const item of raw.comparison) {
      const row = parseComparison(item);
      if (row) {
        comparison.push(row);
      }
      if (comparison.length >= 5) {
        break;
      }
    }
  }

  return {
    findings,
    alternative,
    comparison: comparison.length > 0 ? comparison : null,
    alternativeApplied,
    fromStyle,
  };
}
