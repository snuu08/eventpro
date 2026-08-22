const FORBIDDEN_PATTERNS = [
  /안전합니다/g,
  /위험하지 않습니다/g,
  /안전점수/g,
  /최적의 배치입니다/g,
  /최적의 배치/g,
  /출구 수면 충분/g,
  /법적 기준을 충족/g,
  /법적 기준/g,
];

export function containsForbidden(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function sanitizeReviewText(text: string): string {
  let next = text.trim();
  for (const pattern of FORBIDDEN_PATTERNS) {
    pattern.lastIndex = 0;
    next = next.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
  }
  return next;
}
