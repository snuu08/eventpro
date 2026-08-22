import { LAYOUT_META } from "../layout/types";
import type { LayoutStyle } from "../layout/types";
import { REVIEW_TOPIC_LABELS, type OpsReview } from "../review/types";
import "./ReviewPanel.css";

interface ReviewPanelProps {
  review: OpsReview | null;
  currentStyle: LayoutStyle;
  busy: boolean;
  error: string;
  canReview: boolean;
  onReview: () => void;
  onKeepCurrent: () => void;
  onApplyAlternative: () => void;
}

export function ReviewPanel({
  review,
  currentStyle,
  busy,
  error,
  canReview,
  onReview,
  onKeepCurrent,
  onApplyAlternative,
}: ReviewPanelProps) {
  return (
    <div className="review-panel">
      <h2>AI 운영 검토</h2>
      <p className="review-lead">
        법적·안전 인증이 아닙니다. 행사 운영에서 확인하면 좋은 관계를 보여줍니다.
      </p>
      <button
        type="button"
        className="primary-btn review-run"
        onClick={onReview}
        disabled={!canReview || busy}
      >
        {busy ? "검토 중..." : "AI 운영 검토"}
      </button>
      {error ? <p className="review-error">{error}</p> : null}

      {!review && !busy ? (
        <p className="review-empty">배치를 만든 뒤 검토하면 전력, 대기, 소음, 준비상태를 한곳에서 볼 수 있습니다.</p>
      ) : null}

      {review ? (
        <>
          <ul className="review-findings">
            {review.findings.map((finding) => (
              <li key={`${finding.topic}-${finding.message}`}>
                <strong>{REVIEW_TOPIC_LABELS[finding.topic]}</strong>
                <span>{finding.message}</span>
              </li>
            ))}
          </ul>

          {review.alternative && !review.alternativeApplied ? (
            <div className="review-alt">
              <p>
                현재: {LAYOUT_META[currentStyle].title}
              </p>
              <p>{review.alternative.currentProblem}</p>
              <p>{review.alternative.reason}</p>
              <div className="review-alt-actions">
                <button type="button" className="ghost-btn" onClick={onKeepCurrent}>
                  현재 배치 유지
                </button>
                <button type="button" className="primary-btn" onClick={onApplyAlternative}>
                  {LAYOUT_META[review.alternative.style].title} 배치 보기
                </button>
              </div>
            </div>
          ) : null}

          {review.alternativeApplied && review.alternative ? (
            <p className="review-applied">
              대안 {LAYOUT_META[review.alternative.style].title} 배치를 적용했습니다.
            </p>
          ) : null}

          {review.comparison && (review.alternative || review.alternativeApplied) ? (
            <div className="review-compare">
              <h3>배치 비교</h3>
              <p>
                현재안: {LAYOUT_META[review.fromStyle].title}
                {review.alternative ? ` · 대안: ${LAYOUT_META[review.alternative.style].title}` : ""}
              </p>
              <ul>
                {review.comparison.map((row) => (
                  <li key={row.aspect}>
                    <strong>{row.aspect}</strong>
                    <span>현재: {row.current}</span>
                    <span>대안: {row.alternative}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
