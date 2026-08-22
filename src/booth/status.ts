import type { Booth, BoothAnalysis, BoothStatus, ReadinessIssue, ReadinessSummary } from "./types";

export function reviewReasons(analysis: BoothAnalysis): string[] {
  const reasons: string[] = [];
  if (analysis.power.value === "needs_review") {
    reasons.push("전력 여부");
  }
  if (analysis.internet.value === "needs_review") {
    reasons.push("인터넷 여부");
  }
  if (analysis.water.value === "needs_review") {
    reasons.push("급수 여부");
  }
  if (analysis.drainage.value === "needs_review") {
    reasons.push("배수 여부");
  }
  if (analysis.waitingArea.value === "needs_review") {
    reasons.push("대기공간 여부");
  }
  if (analysis.storage.value === "needs_review") {
    reasons.push("물품보관 여부");
  }
  if (analysis.waste.value === "needs_review") {
    reasons.push("쓰레기 발생");
  }
  if (analysis.noise.value === "needs_review") {
    reasons.push("소음");
  }
  if (analysis.staff.value.needsReview) {
    reasons.push("운영인력");
  }
  return reasons;
}

export function boothStatus(booth: Booth): BoothStatus {
  if (!booth.description.trim()) {
    return "needs_setup";
  }
  if (!booth.analysis) {
    return "needs_setup";
  }
  if (!booth.confirmed || reviewReasons(booth.analysis).length > 0) {
    return "needs_review";
  }
  return "complete";
}

export function summarizeReadiness(booths: Booth[]): ReadinessSummary {
  const issues: ReadinessIssue[] = [];
  let complete = 0;
  let needsReview = 0;
  let needsSetup = 0;

  for (const booth of booths) {
    const status = boothStatus(booth);
    if (status === "complete") {
      complete += 1;
      continue;
    }
    if (status === "needs_setup") {
      needsSetup += 1;
      issues.push({
        boothId: booth.id,
        code: booth.code,
        message: `${booth.code} 프로그램 설명 없음`,
      });
      continue;
    }
    needsReview += 1;
    const reasons = booth.analysis ? reviewReasons(booth.analysis) : [];
    if (reasons.length === 0) {
      issues.push({
        boothId: booth.id,
        code: booth.code,
        message: `${booth.code} 사용자 확인 필요`,
      });
    } else {
      for (const reason of reasons) {
        issues.push({
          boothId: booth.id,
          code: booth.code,
          message: `${booth.code} ${reason}`,
        });
      }
    }
  }

  const total = booths.length;
  return {
    total,
    complete,
    needsReview,
    needsSetup,
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
    issueCount: issues.length,
    issues,
  };
}
