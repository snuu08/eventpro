import type { Booth } from "../booth/types";
import { STATUS_LABELS } from "../booth/labels";
import { boothStatus } from "../booth/status";
import "./BoothSidebar.css";

interface BoothSidebarProps {
  booths: Booth[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function BoothSidebar({ booths, selectedId, onSelect }: BoothSidebarProps) {
  return (
    <div className="booth-sidebar">
      <h2>부스 목록</h2>
      <p className="booth-sidebar-lead">지도에는 아직 배치하지 않습니다. 설명을 먼저 구조화하세요.</p>
      {booths.length === 0 ? (
        <p className="booth-sidebar-empty">생성된 부스가 없습니다.</p>
      ) : (
        <ul className="booth-list">
          {booths.map((booth) => {
            const status = boothStatus(booth);
            return (
              <li key={booth.id}>
                <button
                  type="button"
                  className={selectedId === booth.id ? "booth-item is-active" : "booth-item"}
                  onClick={() => onSelect(booth.id)}
                >
                  <strong>{booth.code}</strong>
                  <span className={`booth-status is-${status}`}>{STATUS_LABELS[status]}</span>
                  {booth.analysis?.boothName.value ? (
                    <em>{booth.analysis.boothName.value}</em>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
