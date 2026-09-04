import { useRef, useState } from "react";
import { LAYOUT_PATTERNS, UI_COPY } from "../../shared/copy";
import { explainSelection } from "../../layout/explainLayout";
import { compareManualMove, REVERT_TO_AUTO_CONFIRM } from "../../layout/scoreDelta";
import { CandidateCompare } from "../../charts/CandidateCompare";
import type { EventProjectRecord } from "../../project/schema";
import type { LayoutRules, VenueObstacle } from "../../types/eventProject";
import type { OsmFetchStatus } from "../../geo/osmObstacles";

export const DEFAULT_LAYOUT_RULES: LayoutRules = {
  pattern: "custom",
  aisleWidth: 0.04,
  boothGap: 0.03,
  entranceClearance: 0.06,
  exitClearance: 0.06,
  keepPopularBoothsApart: true,
  keepNoisyZoneAwayFromQuietZone: true,
};

export type GapPreview = { kind: "aisle" | "gap"; aisleWidth: number; boothGap: number } | null;

type Props = {
  project: EventProjectRecord;
  onProject: (project: EventProjectRecord) => void;
  selectedId?: string;
  onSelect: (id: string) => void;
  error?: string;
  onGapPreview?: (preview: GapPreview) => void;
  osmStatus?: OsmFetchStatus;
  onHideObstacle?: (id: string) => void;
};

export function LayoutPanel({ project, onProject, selectedId, onSelect, error, onGapPreview, osmStatus = "idle", onHideObstacle }: Props) {
  const [rules, setRules] = useState<LayoutRules>(project.layoutRules ?? DEFAULT_LAYOUT_RULES);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const selected = project.candidates.find((item) => item.id === project.selectedCandidateId);
  const explanation = project.selectedCandidateId
    ? explainSelection(project.purpose, project.candidates, project.selectedCandidateId)
    : null;
  const custom = rules.pattern === "custom";
  const visibleObstacles = (project.obstacles ?? []).filter((item: VenueObstacle) => item.confirmed);

  function saveRules(next: LayoutRules) {
    setRules(next);
    onProject({ ...project, layoutRules: next, updatedAt: new Date().toISOString() });
  }

  function setPattern(pattern: LayoutRules["pattern"]) {
    saveRules({ ...rules, pattern });
  }

  function clearBooth(id: string) {
    onProject({
      ...project,
      booths: project.booths.map((booth) => (booth.id === id ? { ...booth, position: undefined } : booth)),
      updatedAt: new Date().toISOString(),
    });
  }

  function revert() {
    if (!selected || !confirm(REVERT_TO_AUTO_CONFIRM)) {
      return;
    }
    const original = project.candidates.find((item) => item.id === project.selectedCandidateId);
    if (!original) {
      return;
    }
    onProject({ ...project, booths: original.booths, updatedAt: new Date().toISOString() });
  }

  const deltas = selected
    ? compareManualMove(selected, { ...selected, booths: project.booths, score: selected.score })
    : [];

  return (
    <div className="space-y-3 text-sm">
      {osmStatus !== "idle" || visibleObstacles.length ? (
      <div className="rounded border bg-white px-2 py-2 text-xs text-gray-700">
        {osmStatus === "loading" ? <p>{UI_COPY.osmLoading}</p> : null}
        {osmStatus === "ready" ? <p>장애물 {visibleObstacles.length}개 · {UI_COPY.osmCredit}</p> : null}
        {osmStatus === "empty" ? <p>{UI_COPY.osmEmpty}</p> : null}
        {osmStatus === "error" ? <p>{UI_COPY.osmFail}</p> : null}
        {osmStatus === "skipped" ? <p>{UI_COPY.osmSkip}</p> : null}
        {visibleObstacles.length ? (
          <details className="mt-2">
            <summary>{UI_COPY.osmHideHint}</summary>
            <ul className="mt-1 space-y-1">
              {visibleObstacles.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span>
                    {item.type} · {item.osmId}
                  </span>
                  <button type="button" className="underline" onClick={() => onHideObstacle?.(item.id)}>
                    숨기기
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      ) : null}
      {custom ? (
        <div className="space-y-2">
          <p>프로그램 {project.booths.length}개</p>
          <ul className="max-h-40 space-y-1 overflow-auto">
            {project.booths.map((booth) => (
              <li key={booth.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className={`min-w-0 flex-1 rounded px-2 py-1 text-left ${selectedId === booth.id ? "bg-gray-900 text-white" : "bg-white"}`}
                  onClick={() => onSelect(booth.id)}
                >
                  {booth.name}
                  <span className={`ml-1 text-xs ${selectedId === booth.id ? "text-gray-300" : "text-gray-500"}`}>
                    {booth.position ? "놓음" : "안 놓음"}
                  </span>
                </button>
                {booth.position ? (
                  <button type="button" className="shrink-0 underline" onClick={() => clearBooth(booth.id)}>
                    위치 지우기
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <p>{UI_COPY.customPlaceHint}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-2">
        {LAYOUT_PATTERNS.map((item) => (
          <label key={item.id} className="flex items-center gap-2 rounded border bg-white px-2 py-1">
            <input
              type="radio"
              name="layout-pattern"
              checked={rules.pattern === item.id}
              onChange={() => setPattern(item.id)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      {custom ? null : (
        <>
          <label>
            통로 폭
            <input
              className="w-full"
              type="range"
              min={0.02}
              max={0.08}
              step={0.005}
              value={rules.aisleWidth}
              onPointerDown={() => onGapPreview?.({ kind: "aisle", aisleWidth: rules.aisleWidth, boothGap: rules.boothGap })}
              onPointerUp={() => {
                onGapPreview?.(null);
                saveRules(rulesRef.current);
              }}
              onPointerCancel={() => onGapPreview?.(null)}
              onChange={(e) => {
                const next = { ...rulesRef.current, aisleWidth: Number(e.target.value) };
                rulesRef.current = next;
                setRules(next);
                onGapPreview?.({ kind: "aisle", aisleWidth: next.aisleWidth, boothGap: next.boothGap });
              }}
            />
          </label>
          <label>
            부스 간격
            <input
              className="w-full"
              type="range"
              min={0.02}
              max={0.08}
              step={0.005}
              value={rules.boothGap}
              onPointerDown={() => onGapPreview?.({ kind: "gap", aisleWidth: rules.aisleWidth, boothGap: rules.boothGap })}
              onPointerUp={() => {
                onGapPreview?.(null);
                saveRules(rulesRef.current);
              }}
              onPointerCancel={() => onGapPreview?.(null)}
              onChange={(e) => {
                const next = { ...rulesRef.current, boothGap: Number(e.target.value) };
                rulesRef.current = next;
                setRules(next);
                onGapPreview?.({ kind: "gap", aisleWidth: next.aisleWidth, boothGap: next.boothGap });
              }}
            />
          </label>
          <details>
            <summary>고급 규칙</summary>
            <label className="mt-2 block">
              출입구 여유
              <input
                className="w-full"
                type="range"
                min={0.02}
                max={0.12}
                step={0.01}
                value={rules.entranceClearance}
                onChange={(e) =>
                  saveRules({ ...rules, entranceClearance: Number(e.target.value), exitClearance: Number(e.target.value) })
                }
              />
            </label>
          </details>
        </>
      )}
      {error ? <p className="text-red-700">{error}</p> : null}
      {custom ? null : (
        <>
          {project.candidates.length ? <CandidateCompare candidates={project.candidates} /> : null}
          <p className="text-xs text-gray-500">점수는 배치 기반 예상입니다. 인파 시뮬 점수는 아닙니다.</p>
          {explanation && selected ? (
            <div className="rounded bg-white p-2">
              <p>추천·선택 이유: {explanation.selectedWhy}</p>
              {explanation.alternatives.map((item) => (
                <p key={item.label}>
                  {item.label}안이 더 유리한 때: {item.whenBetter}
                </p>
              ))}
              <button type="button" className="mt-2 underline" onClick={revert}>
                선택한 자동 배치로 되돌리기
              </button>
              {deltas.map((item) => (
                <p key={item.key}>
                  {item.label} {item.delta > 0 ? "+" : ""}
                  {(item.delta * 100).toFixed(0)}
                </p>
              ))}
            </div>
          ) : (
            <p>일자형 등은 한 안을 고른 뒤 미세 조정할 수 있습니다.</p>
          )}
        </>
      )}
    </div>
  );
}
