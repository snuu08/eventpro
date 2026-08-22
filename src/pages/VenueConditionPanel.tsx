import type { VenueConditions } from "../types/venue";
import { FACILITY_LABELS, PORTAL_LABELS } from "../types/venue";
import type { VenueTool } from "./venueTools";
import "./VenueConditionPanel.css";

interface VenueConditionPanelProps {
  conditions: VenueConditions;
  tool: VenueTool;
  onToolChange: (tool: VenueTool) => void;
  onRemove: (id: string) => void;
}

const PORTAL_TOOLS: { id: PortalTool; label: string }[] = [
  { id: "entrance", label: "입구 추가" },
  { id: "exit", label: "출구 추가" },
  { id: "both", label: "입·출구 겸용" },
];

type PortalTool = Extract<VenueTool, "entrance" | "exit" | "both">;

const FACILITY_TOOLS: { id: VenueTool; label: string }[] = [
  { id: "stage", label: "무대" },
  { id: "restroom", label: "화장실" },
  { id: "power", label: "전력 위치" },
  { id: "hq", label: "운영본부" },
  { id: "info", label: "안내소" },
  { id: "other", label: "기타" },
];

function hintFor(tool: VenueTool): string {
  switch (tool) {
    case "select":
      return "도구를 선택한 뒤 지도를 클릭하세요. 마커는 드래그해서 옮길 수 있습니다.";
    case "entrance":
      return "지도를 클릭해 입구를 놓으세요.";
    case "exit":
      return "지도를 클릭해 출구를 놓으세요.";
    case "both":
      return "지도를 클릭해 입·출구 겸용을 놓으세요.";
    case "zone":
      return "설치 불가 영역의 한쪽 모서리를 클릭한 뒤, 반대 모서리를 클릭하세요.";
    case "special":
      return "지도를 클릭한 뒤 특별 시설 설명을 입력하세요.";
    default:
      return `지도를 클릭해 ${FACILITY_LABELS[tool]}을(를) 놓으세요.`;
  }
}

export function VenueConditionPanel({
  conditions,
  tool,
  onToolChange,
  onRemove,
}: VenueConditionPanelProps) {
  const items: { id: string; title: string; subtitle?: string }[] = [
    ...conditions.portals.map((portal, index) => ({
      id: portal.id,
      title: `${PORTAL_LABELS[portal.kind]} ${index + 1}`,
    })),
    ...conditions.facilities.map((facility) => {
      const sameKind = conditions.facilities.filter((item) => item.kind === facility.kind);
      const order = sameKind.findIndex((item) => item.id === facility.id) + 1;
      const base = facility.label?.trim() || FACILITY_LABELS[facility.kind];
      return {
        id: facility.id,
        title: facility.kind === "special" ? base : `${base} ${order}`,
        subtitle: facility.description,
      };
    }),
    ...conditions.zones.map((zone, index) => ({
      id: zone.id,
      title: `설치 불가 영역 ${index + 1}`,
    })),
  ];

  return (
    <aside className="venue-panel">
      <h2>고정 조건</h2>
      <p className="venue-hint">{hintFor(tool)}</p>

      <div className="tool-block">
        <button
          type="button"
          className={tool === "select" ? "tool-btn is-active" : "tool-btn"}
          onClick={() => onToolChange("select")}
        >
          선택
        </button>
      </div>

      <p className="tool-label">입·출구</p>
      <div className="tool-grid">
        {PORTAL_TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tool === item.id ? "tool-btn is-active" : "tool-btn"}
            onClick={() => onToolChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="tool-label">설치 제한</p>
      <div className="tool-grid">
        <button
          type="button"
          className={tool === "zone" ? "tool-btn is-active" : "tool-btn"}
          onClick={() => onToolChange("zone")}
        >
          설치 불가 영역
        </button>
      </div>

      <p className="tool-label">기존 고정시설</p>
      <div className="tool-grid">
        {FACILITY_TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tool === item.id ? "tool-btn is-active" : "tool-btn"}
            onClick={() => onToolChange(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={tool === "special" ? "tool-btn is-active" : "tool-btn"}
          onClick={() => onToolChange("special")}
        >
          특별 시설 추가
        </button>
      </div>

      <p className="tool-label">배치된 항목</p>
      {items.length === 0 ? (
        <p className="venue-empty">아직 올린 고정 조건이 없습니다.</p>
      ) : (
        <ul className="condition-list">
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.title}</strong>
                {item.subtitle ? <span>{item.subtitle}</span> : null}
              </div>
              <button type="button" onClick={() => onRemove(item.id)}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
