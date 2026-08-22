import { useState } from "react";
import type { FormEvent } from "react";
import { analyzeBooth, BoothAnalysisError } from "../ai/analyzeBooth";
import type { EventDraft } from "../types/event";
import type {
  Booth,
  BoothAnalysis,
  BoothType,
  LevelNeed,
  Sourced,
  TernaryNeed,
} from "../booth/types";
import { BOOTH_TYPES, LEVEL_NEEDS, TERNARY_NEEDS } from "../booth/types";
import {
  BOOTH_TYPE_LABELS,
  LEVEL_LABELS,
  STATUS_LABELS,
  TERNARY_LABELS,
} from "../booth/labels";
import { boothStatus, reviewReasons } from "../booth/status";
import "./BoothEditorPanel.css";

interface BoothEditorPanelProps {
  booth: Booth;
  draft: EventDraft;
  onClose: () => void;
  onUserInput: (text: string) => void;
  onAnalyzed: (analysis: BoothAnalysis) => void;
  onUpdate: (updater: (current: BoothAnalysis) => BoothAnalysis) => void;
  onConfirm: () => void;
}

function sourceLabel(source: "ai" | "user"): string {
  return source === "user" ? "직접 수정" : "AI 추천";
}

function markUser<T>(value: T): Sourced<T> {
  return { value, source: "user" };
}

export function BoothEditorPanel({
  booth,
  draft,
  onClose,
  onUserInput,
  onAnalyzed,
  onUpdate,
  onConfirm,
}: BoothEditorPanelProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = boothStatus(booth);
  const analysis = booth.analysis;
  const reasons = analysis ? reviewReasons(analysis) : [];
  const canConfirm = Boolean(analysis) && reasons.length === 0 && !booth.confirmed;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = text.trim();
    if (!next || busy) {
      return;
    }

    setBusy(true);
    setError("");
    onUserInput(next);
    setText("");

    try {
      const result = await analyzeBooth({
        boothCode: booth.code,
        eventName: draft.name,
        eventType: draft.eventType,
        messages: [...booth.messages, { role: "user", content: next }],
      });
      onAnalyzed(result);
    } catch (err) {
      setError(err instanceof BoothAnalysisError ? err.message : "분석에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="booth-editor">
      <header className="booth-editor-head">
        <div>
          <h2>
            {booth.code}
            <span className={`booth-status is-${status}`}>{STATUS_LABELS[status]}</span>
          </h2>
        </div>
        <button type="button" className="ghost-btn" onClick={onClose}>
          닫기
        </button>
      </header>

      <p className="booth-question">이 부스에서는 무엇을 하나요?</p>

      <div className="booth-thread">
        {booth.messages.length === 0 ? (
          <p className="booth-thread-empty">
            예: 스톱워치로 정확하게 10초를 맞추는 게임이야. 모니터로 시간을 보여주고 성공하면 상품을 줘.
          </p>
        ) : (
          booth.messages.map((message, index) => (
            <p key={`${message.role}-${index}`} className={`booth-msg is-${message.role}`}>
              {message.content}
            </p>
          ))
        )}
      </div>

      <form className="booth-chat" onSubmit={submit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="부스에서 하는 일을 설명하세요."
          rows={4}
          disabled={busy}
        />
        <button type="submit" className="primary-btn" disabled={busy || !text.trim()}>
          {busy ? "분석 중..." : "운영조건 분석"}
        </button>
      </form>
      {error ? <p className="booth-error">{error}</p> : null}

      {analysis ? (
        <section className="booth-fields">
          <h3>운영조건</h3>
          <p className="booth-fields-lead">AI 추천은 확정값이 아닙니다. 직접 고칠 수 있습니다.</p>

          <label className="booth-field">
            <span>
              부스명 <i>{sourceLabel(analysis.boothName.source)}</i>
            </span>
            <input
              type="text"
              value={analysis.boothName.value}
              onChange={(e) =>
                onUpdate((current) => ({
                  ...current,
                  boothName: markUser(e.target.value),
                }))
              }
            />
          </label>

          <label className="booth-field">
            <span>
              유형 <i>{sourceLabel(analysis.type.source)}</i>
            </span>
            <select
              value={analysis.type.value}
              onChange={(e) =>
                onUpdate((current) => ({
                  ...current,
                  type: markUser(e.target.value as BoothType),
                }))
              }
            >
              {BOOTH_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BOOTH_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          {(
            [
              ["power", "전력"],
              ["internet", "인터넷"],
              ["water", "급수"],
              ["drainage", "배수"],
              ["waitingArea", "대기공간"],
              ["storage", "물품보관"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="booth-field">
              <span>
                {label} <i>{sourceLabel(analysis[field].source)}</i>
              </span>
              <select
                value={analysis[field].value}
                onChange={(e) =>
                  onUpdate((current) => ({
                    ...current,
                    [field]: markUser(e.target.value as TernaryNeed),
                  }))
                }
              >
                {TERNARY_NEEDS.map((need) => (
                  <option key={need} value={need}>
                    {TERNARY_LABELS[need]}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label className="booth-field">
            <span>
              사용 전기장비 <i>{sourceLabel(analysis.electricalEquipment.source)}</i>
            </span>
            <input
              type="text"
              value={analysis.electricalEquipment.value.join(", ")}
              onChange={(e) =>
                onUpdate((current) => ({
                  ...current,
                  electricalEquipment: markUser(
                    e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  ),
                }))
              }
              placeholder="모니터, 노트북"
            />
          </label>

          {(
            [
              ["waste", "쓰레기 발생"],
              ["noise", "소음"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="booth-field">
              <span>
                {label} <i>{sourceLabel(analysis[field].source)}</i>
              </span>
              <select
                value={analysis[field].value}
                onChange={(e) =>
                  onUpdate((current) => ({
                    ...current,
                    [field]: markUser(e.target.value as LevelNeed),
                  }))
                }
              >
                {LEVEL_NEEDS.map((level) => (
                  <option key={level} value={level}>
                    {LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <div className="booth-field">
            <span>
              운영인력 <i>{sourceLabel(analysis.staff.source)}</i>
            </span>
            <div className="booth-staff">
              <input
                type="number"
                min={0}
                step={1}
                value={analysis.staff.value.count ?? ""}
                onChange={(e) => {
                  const count = e.target.value === "" ? null : Number(e.target.value);
                  onUpdate((current) => ({
                    ...current,
                    staff: markUser({
                      count: count !== null && Number.isFinite(count) ? Math.max(0, Math.round(count)) : null,
                      needsReview: count === null,
                    }),
                  }));
                }}
                placeholder="명시된 경우만"
              />
              <label className="booth-check">
                <input
                  type="checkbox"
                  checked={analysis.staff.value.needsReview}
                  onChange={(e) =>
                    onUpdate((current) => ({
                      ...current,
                      staff: markUser({
                        ...current.staff.value,
                        needsReview: e.target.checked,
                      }),
                    }))
                  }
                />
                확인 필요
              </label>
            </div>
          </div>

          {reasons.length > 0 ? (
            <p className="booth-review">확인 필요: {reasons.join(", ")}</p>
          ) : null}

          <button
            type="button"
            className="primary-btn"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {booth.confirmed ? "설정 완료됨" : "이 부스 설정 완료"}
          </button>
        </section>
      ) : null}
    </aside>
  );
}
