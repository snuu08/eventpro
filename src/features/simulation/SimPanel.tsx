import { useEffect, useMemo, useState } from "react";
import { UI_COPY } from "../../shared/copy";
import { createSimulation, formatEstimate, stepSimulation, summarize, type SimInput, type SimState } from "../../sim/simulate";
import { formatSimReport } from "../../sim/report";
import type { SimScenario } from "../../sim/constants";
import type { EventProjectRecord } from "../../project/schema";
import type { Agent } from "../../sim/simulate";
import { projectToExportJson } from "../project/transfer";

type Props = {
  project: EventProjectRecord;
  onAgents: (agents: Agent[], heat: SimState["cellHits"]) => void;
};

export function SimPanel({ project, onAgents }: Props) {
  const [scenario, setScenario] = useState<SimScenario>("normal");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const input: SimInput = useMemo(
    () => ({
      expectedVisitors: project.expectedVisitors,
      purpose: project.purpose,
      scenario,
      durationMinutes: 40,
      venuePolygon: project.venuePolygon,
      accessPoints: project.accessPoints,
      booths: project.booths,
      optionalFacilities: project.optionalFacilities,
      obstacles: project.obstacles,
    }),
    [project, scenario],
  );

  const [state, setState] = useState<SimState>(() => createSimulation(input));

  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = window.setInterval(() => {
      setState((current) => {
        if (!current) {
          return current;
        }
        let next = current;
        for (let i = 0; i < speed; i += 1) {
          next = stepSimulation(next, input);
        }
        onAgents(next.agents, next.cellHits);
        return next;
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, [playing, speed, input, onAgents]);

  const metrics = state ? summarize(state, input) : null;
  const report = metrics ? formatSimReport(metrics) : null;
  const inside = state?.agents.filter((agent) => agent.state !== "leave").length ?? 0;
  const left = state?.agents.filter((agent) => agent.state === "leave").length ?? 0;

  function download() {
    const blob = new Blob([projectToExportJson(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3 text-sm">
      <p>{UI_COPY.resultDisclaimer}</p>
      <div className="flex flex-wrap gap-2">
        {(["normal", "peak", "emergency"] as const).map((item) => (
          <button key={item} type="button" className={`rounded border px-2 py-1 ${scenario === item ? "bg-gray-900 text-white" : "bg-white"}`} onClick={() => {
            setScenario(item);
            setPlaying(false);
            const nextInput = { ...input, scenario: item };
            const next = createSimulation(nextInput);
            setState(next);
            onAgents(next.agents, next.cellHits);
          }}>
            {item === "normal" ? "일반 운영" : item === "peak" ? "피크 시간" : "비상 퇴장"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border px-2 py-1" onClick={() => setPlaying(true)}>
          재생
        </button>
        <button type="button" className="rounded border px-2 py-1" onClick={() => setPlaying(false)}>
          일시정지
        </button>
        <button type="button" className="rounded border px-2 py-1" onClick={() => {
          const next = createSimulation(input);
          setState(next);
          onAgents(next.agents, next.cellHits);
          setPlaying(false);
        }}>
          초기화
        </button>
        {[0.5, 1, 2, 4].map((value) => (
          <button key={value} type="button" className="rounded border px-2 py-1" onClick={() => setSpeed(value)}>
            {value}x
          </button>
        ))}
      </div>
      <p>
        시간 {formatEstimate(state?.time ?? 0, "분")} · 내부 {formatEstimate(inside, "명")} · 입장 {formatEstimate(state?.spawned ?? 0)} · 퇴장 {formatEstimate(left)}
      </p>
      {report ? (
        <ul className="space-y-1 text-xs">
          <li>혼잡 {report.congestionScore}</li>
          <li>평균 대기 {report.averageWaitMinutes}</li>
          <li>최대 대기 {report.maxWaitMinutes}</li>
          <li>평균 이동 {report.averageWalkingDistance}</li>
          <li>출구 접근 {report.averageExitAccessMinutes}</li>
          {report.emergencyClearMinutes ? <li>비상 퇴장 {report.emergencyClearMinutes}</li> : null}
          <li>붐비는 부스: {report.busiestBooths.join(" / ")}</li>
          <li>병목: {report.bottlenecks.join(" / ")}</li>
        </ul>
      ) : null}
      <button type="button" className="rounded bg-gray-900 px-3 py-2 text-white" onClick={download}>
        프로젝트 내보내기
      </button>
    </div>
  );
}
