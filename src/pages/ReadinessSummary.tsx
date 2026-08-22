import type { ReadinessIssue, ReadinessSummary as Readiness } from "../booth/types";
import "./ReadinessSummary.css";

interface ReadinessSummaryProps {
  readiness: Readiness;
  onIssueClick?: (issue: ReadinessIssue) => void;
}

export function ReadinessSummary({ readiness, onIssueClick }: ReadinessSummaryProps) {
  if (readiness.total === 0) {
    return null;
  }

  return (
    <div className="readiness">
      <p className="readiness-title">행사 준비도 {readiness.percent}%</p>
      <p className="readiness-counts">
        설정 완료 {readiness.complete} / {readiness.total}
        <span>확인 필요 {readiness.issueCount}건</span>
        <span>미입력 {readiness.needsSetup}</span>
      </p>
      {readiness.issues.length > 0 ? (
        <ul className="readiness-issues">
          {readiness.issues.slice(0, 4).map((issue) => (
            <li key={`${issue.boothId}-${issue.message}`}>
              {onIssueClick ? (
                <button type="button" onClick={() => onIssueClick(issue)}>
                  {issue.message}
                </button>
              ) : (
                issue.message
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="readiness-ok">모든 부스 설정이 완료되었습니다.</p>
      )}
    </div>
  );
}
