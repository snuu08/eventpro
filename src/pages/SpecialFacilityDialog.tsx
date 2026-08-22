import { useState } from "react";
import type { FormEvent } from "react";
import type { Facility } from "../types/venue";
import "./SpecialFacilityDialog.css";

interface SpecialFacilityDialogProps {
  onCancel: () => void;
  onSave: (facility: Omit<Facility, "id" | "position" | "kind">) => void;
}

export function SpecialFacilityDialog({ onCancel, onSave }: SpecialFacilityDialogProps) {
  const [description, setDescription] = useState("");
  const [label, setLabel] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [needsPower, setNeedsPower] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = description.trim();
    if (!text) {
      setError("시설 설명을 입력하세요.");
      return;
    }

    const widthM = Number(width);
    const heightM = Number(height);
    const hasSize = width.trim() !== "" || height.trim() !== "";
    if (hasSize && (!Number.isFinite(widthM) || !Number.isFinite(heightM) || widthM <= 0 || heightM <= 0)) {
      setError("크기를 입력하면 가로·세로 모두 0보다 큰 숫자여야 합니다.");
      return;
    }

    onSave({
      description: text,
      label: label.trim() || undefined,
      sizeM: hasSize ? { width: widthM, height: heightM } : undefined,
      needsPower: needsPower || undefined,
    });
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="dialog-card"
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>특별 시설 추가</h2>
        <p>현장 조건을 문장으로 남기면 됩니다. 예: 에어바운스가 8×6m 정도이고 전기가 필요해.</p>

        <label className="dialog-field">
          <span>설명</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="에어바운스가 8×6m 정도이고 전기가 필요해."
            required
          />
        </label>

        <label className="dialog-field">
          <span>이름 (선택)</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: 에어바운스"
          />
        </label>

        <div className="dialog-size">
          <label className="dialog-field">
            <span>가로 m (선택)</span>
            <input
              type="number"
              min={0.1}
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </label>
          <label className="dialog-field">
            <span>세로 m (선택)</span>
            <input
              type="number"
              min={0.1}
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>
        </div>

        <label className="dialog-check">
          <input
            type="checkbox"
            checked={needsPower}
            onChange={(e) => setNeedsPower(e.target.checked)}
          />
          전기가 필요함 (선택)
        </label>

        {error ? <p className="dialog-error">{error}</p> : null}

        <div className="dialog-actions">
          <button type="button" className="ghost-btn" onClick={onCancel}>
            취소
          </button>
          <button type="submit" className="primary-btn">
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
