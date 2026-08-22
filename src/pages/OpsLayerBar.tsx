import { OPS_LAYER_LABELS, OPS_LAYERS, type OpsLayer } from "../ops/types";
import "./OpsLayerBar.css";

interface OpsLayerBarProps {
  layer: OpsLayer;
  onChange: (layer: OpsLayer) => void;
}

export function OpsLayerBar({ layer, onChange }: OpsLayerBarProps) {
  return (
    <div className="ops-layer-bar">
      <p>운영 Layer</p>
      <div className="ops-layer-tabs" role="tablist" aria-label="운영 레이어">
        {OPS_LAYERS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={layer === item}
            className={layer === item ? "is-active" : undefined}
            onClick={() => onChange(item)}
          >
            {OPS_LAYER_LABELS[item]}
          </button>
        ))}
      </div>
      {layer === "noise" ? <span className="ops-hint">진한 빨강: 높음 · 노랑: 보통 · 흐림: 낮음</span> : null}
      {layer === "type" ? <span className="ops-hint">부스 유형별 색으로 구분합니다.</span> : null}
    </div>
  );
}
