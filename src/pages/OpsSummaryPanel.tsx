import type { ReadinessIssue, ReadinessSummary } from "../booth/types";
import type { OpsCounts } from "../ops/types";
import "./OpsSummaryPanel.css";

interface OpsSummaryPanelProps {
  counts: OpsCounts;
  readiness: ReadinessSummary;
  onIssueClick: (issue: ReadinessIssue) => void;
}

const ROWS: { key: keyof OpsCounts; label: string }[] = [
  { key: "power", label: "전력 필요" },
  { key: "internet", label: "인터넷 필요" },
  { key: "water", label: "급수 필요" },
  { key: "drainage", label: "배수 필요" },
  { key: "waiting", label: "대기공간 필요" },
  { key: "storage", label: "물품보관 필요" },
  { key: "noiseHigh", label: "소음 높음" },
  { key: "wasteHigh", label: "쓰레기 높음" },
];

export function OpsSummaryPanel({ counts, readiness, onIssueClick }: OpsSummaryPanelProps) {
  return (
    <div className="ops-summary">
      <h2>운영조건 요약</h2>
      <ul className="ops-counts">
        {ROWS.map((row) => (
          <li key={row.key}>
            <span>{row.label}</span>
            <strong>{counts[row.key]}개 부스</strong>
          </li>
        ))}
      </ul>

      <h3>준비상태</h3>
      <p className="ops-percent">행사 준비도 {readiness.percent}%</p>
      <p className="ops-issue-count">확인 필요 {readiness.issueCount}건</p>
      {readiness.issues.length === 0 ? (
        <p className="ops-ok">확인할 항목이 없습니다.</p>
      ) : (
        <ul className="ops-issues">
          {readiness.issues.map((issue) => (
            <li key={`${issue.boothId}-${issue.message}`}>
              <button type="button" onClick={() => onIssueClick(issue)}>
                {issue.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
