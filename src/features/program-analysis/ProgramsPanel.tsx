import { useRef, useState } from "react";
import { UI_COPY } from "../../shared/copy";
import { analyzeProgram } from "../../ops/analyzeProgram";
import { toProgramRequirements } from "../../ops/analyzeLocal";
import type { ProgramAnalysisResult } from "../../ops/schema";
import type { ProgramBooth } from "../../types/eventProject";

type Props = {
  booths: ProgramBooth[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onChangeBooth: (booth: ProgramBooth) => void;
};

export function ProgramsPanel({ booths, selectedId, onSelect, onChangeBooth }: Props) {
  const selected = booths.find((item) => item.id === selectedId) ?? booths[0];
  const [draft, setDraft] = useState<ProgramAnalysisResult | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const abort = useRef(false);

  async function runAnalysis() {
    if (!selected || busy) {
      return;
    }
    abort.current = false;
    setBusy(true);
    const result = await analyzeProgram({
      name: selected.name,
      description: selected.description,
      category: selected.category,
    });
    if (!abort.current) {
      setDraft(result);
      setDraftOpen(false);
    }
    setBusy(false);
  }

  function applyOne(index: number, accept: boolean) {
    if (!selected || !draft) {
      return;
    }
    const item = draft.requirements[index];
    if (!accept) {
      return;
    }
    const mapped = toProgramRequirements({ requirements: [item], source: draft.source });
    onChangeBooth({
      ...selected,
      requirements: [...selected.requirements.filter((req) => req.key !== item.key), { ...mapped[0], accepted: true }],
    });
  }

  if (!selected) {
    return <p className="text-sm">프로그램이 없습니다.</p>;
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <p>
        프로그램 {booths.length}개
      </p>
      <ul className="max-h-40 space-y-1 overflow-auto">
        {booths.map((booth) => (
          <li key={booth.id}>
            <button
              type="button"
              className={`w-full rounded px-2 py-1 text-left ${selected.id === booth.id ? "bg-gray-900 text-white" : "bg-white"}`}
              onClick={() => onSelect(booth.id)}
            >
              {booth.name}
            </button>
          </li>
        ))}
      </ul>
      <p>{UI_COPY.analysisBefore}</p>
      <div className="flex gap-2">
        <button type="button" className="rounded bg-gray-900 px-3 py-1 text-white disabled:opacity-50" disabled={busy} onClick={() => void runAnalysis()}>
          {busy ? "분석 중…" : "운영조건 분석"}
        </button>
        {busy ? (
          <button type="button" className="rounded border px-3 py-1" onClick={() => { abort.current = true; setBusy(false); }}>
            취소
          </button>
        ) : null}
      </div>
      {draft ? (
        <div className="rounded border bg-white p-2">
          <button
            type="button"
            className="flex w-full items-start gap-1 text-left font-medium"
            aria-expanded={draftOpen}
            onClick={() => setDraftOpen((open) => !open)}
          >
            <span aria-hidden="true">{draftOpen ? "▾" : "▸"}</span>
            <span>
              {draft.source === "ai" ? "AI 초안" : UI_COPY.analysisRule}
              <span className="ml-1 font-normal text-gray-600">운영조건 {draft.requirements.length}건</span>
            </span>
          </button>
          {draftOpen ? (
            <div className="mt-2 max-h-64 space-y-2 overflow-auto">
              {draft.confidence === "low" ? <p>확신 낮음</p> : null}
              <p>{draft.summary}</p>
              {draft.requirements.map((item, index) => (
                <div key={`${item.key}-${index}`} className="rounded bg-gray-50 p-2">
                  <p>
                    {item.key} · {item.level}
                  </p>
                  <p>{item.reason}</p>
                  <button type="button" className="mr-2 underline" onClick={() => applyOne(index, true)}>
                    반영
                  </button>
                  <button type="button" className="underline" onClick={() => applyOne(index, false)}>
                    제외
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProgramsFields({ booth, onChangeBooth }: { booth: ProgramBooth; onChangeBooth: (booth: ProgramBooth) => void }) {
  return (
    <div className="mt-3 space-y-3">
      <label className="block">
        프로그램명
        <input className="mt-1 w-full rounded border px-2 py-1" value={booth.name} onChange={(e) => onChangeBooth({ ...booth, name: e.target.value })} />
      </label>
      <label className="block">
        설명
        <textarea className="mt-1 w-full rounded border px-2 py-1" value={booth.description} onChange={(e) => onChangeBooth({ ...booth, description: e.target.value })} />
      </label>
      <label className="block">
        카테고리
        <input className="mt-1 w-full rounded border px-2 py-1" value={booth.category} onChange={(e) => onChangeBooth({ ...booth, category: e.target.value })} />
      </label>
      <label className="block">
        예상 체류시간(분)
        <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={booth.dwellMinutes} onChange={(e) => onChangeBooth({ ...booth, dwellMinutes: Number(e.target.value) })} />
      </label>
      <label className="block">
        동시 수용인원
        <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={booth.capacity} onChange={(e) => onChangeBooth({ ...booth, capacity: Number(e.target.value) })} />
      </label>
      <label className="block">
        인기도
        <input className="mt-1 w-full" type="range" min={1} max={5} value={booth.popularity} onChange={(e) => onChangeBooth({ ...booth, popularity: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })} />
      </label>
    </div>
  );
}
