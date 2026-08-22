import { LAYOUT_META, LAYOUT_STYLES, type LayoutRecommendation, type LayoutStyle } from "../layout/types";
import "./LayoutPanel.css";

interface LayoutPanelProps {
  style: LayoutStyle;
  recommendation: LayoutRecommendation | null;
  busy: boolean;
  notices: string[];
  canPlace: boolean;
  canReview: boolean;
  reviewBusy: boolean;
  onStyleChange: (style: LayoutStyle) => void;
  onRecommend: () => void;
  onPlace: () => void;
  onReview: () => void;
}

export function LayoutPanel({
  style,
  recommendation,
  busy,
  notices,
  canPlace,
  canReview,
  reviewBusy,
  onStyleChange,
  onRecommend,
  onPlace,
  onReview,
}: LayoutPanelProps) {
  return (
    <section className="layout-panel">
      <div className="layout-styles">
        {LAYOUT_STYLES.map((item) => (
          <button
            key={item}
            type="button"
            className={style === item ? "layout-card is-active" : "layout-card"}
            onClick={() => onStyleChange(item)}
          >
            <strong>{LAYOUT_META[item].title}</strong>
            <span>{LAYOUT_META[item].description}</span>
          </button>
        ))}
      </div>
      <div className="layout-actions">
        <button type="button" className="ghost-btn" onClick={onRecommend} disabled={busy}>
          {busy ? "추천 중..." : "AI 추천"}
        </button>
        <button type="button" className="primary-btn" onClick={onPlace} disabled={!canPlace}>
          행사장 배치 만들기
        </button>
        {canReview ? (
          <button type="button" className="primary-btn" onClick={onReview} disabled={reviewBusy}>
            {reviewBusy ? "검토 중..." : "AI 운영 검토"}
          </button>
        ) : null}
      </div>
      {recommendation ? (
        <p className="layout-recommend">
          추천: {LAYOUT_META[recommendation.style].title} — {recommendation.reason}
        </p>
      ) : null}
      {notices.length > 0 ? (
        <ul className="layout-notices">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
