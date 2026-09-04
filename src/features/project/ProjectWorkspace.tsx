import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadImage, loadProject, saveProject } from "../../project/db";
import { verifyEditPassword } from "../../project/password";
import type { EventProjectRecord } from "../../project/schema";
import { useEditorStore } from "../../state/editorStore";
import { UI_COPY } from "../../shared/copy";
import { FrameStage } from "../map/FrameStage";
import { PlaceActionsPane, PlaceSearchPane } from "../map/PlaceControls";
import { PlaceSessionHost } from "../map/usePlaceSession";
import { EditorOverlay, type EditorTool } from "../venue/EditorOverlay";
import { canEnterLayout, snapToPolygon, validateVenue } from "../venue/geo";
import { pointInPolygon } from "../../layout/polygon";
import { ProgramsFields, ProgramsPanel } from "../program-analysis/ProgramsPanel";
import { DEFAULT_LAYOUT_RULES, LayoutPanel, type GapPreview } from "../layout/LayoutPanel";
import { SimPanel } from "../simulation/SimPanel";
import { generateLayoutCandidates, rescoreCandidate } from "../../layout/autoLayout";
import { DEFAULT_BOOTH_SIZE, boothFacing, setBoothOrientation } from "../../layout/booth";
import type { AccessPoint, LayoutCandidate, LockedMapState, NormalizedPoint, ProgramBooth } from "../../types/eventProject";
import type { Agent } from "../../sim/simulate";
import type { HeatCell } from "../../sim/simulate";
import {
  fetchVenueOsmObstacles,
  mergeObstacleConfirmation,
  shouldFetchOsmObstacles,
  type OsmFetchStatus,
} from "../../geo/osmObstacles";

const STEPS = [
  { id: "place", label: "장소" },
  { id: "venue", label: "영역" },
  { id: "programs", label: "프로그램" },
  { id: "layout", label: "배치" },
  { id: "results", label: "결과" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function unlocked(id: string): boolean {
  return sessionStorage.getItem(`eventlab-unlock:${id}`) === "1";
}

export function ProjectWorkspace() {
  const { projectId } = useParams();
  const [project, setProject] = useState<EventProjectRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [opened, setOpened] = useState(false);
  const [gate, setGate] = useState("");
  const [gateError, setGateError] = useState("");
  const [fails, setFails] = useState(0);
  const [step, setStep] = useState<StepId>("place");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [tool, setTool] = useState<EditorTool>("polygon");
  const [imageUrl, setImageUrl] = useState<string>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [heat, setHeat] = useState<HeatCell[]>([]);
  const [venueHint, setVenueHint] = useState("");
  const [history, setHistory] = useState<EventProjectRecord[]>([]);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutError, setLayoutError] = useState("");
  const [gapPreview, setGapPreview] = useState<GapPreview>(null);
  const [osmStatus, setOsmStatus] = useState<OsmFetchStatus>("idle");
  const mapHost = useRef<HTMLDivElement>(null);
  const projectRef = useRef<EventProjectRecord | null>(null);
  const zoom = useEditorStore((s) => s.workspaceZoom);
  const setZoom = useEditorStore((s) => s.setWorkspaceZoom);
  const selectedId = useEditorStore((s) => s.selectedIds[0]);
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    if (step !== "layout") {
      return;
    }
    const pattern = project?.layoutRules?.pattern ?? "custom";
    setTool(pattern === "custom" ? "booth" : "select");
  }, [step, project?.layoutRules?.pattern]);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    let cancelled = false;
    void loadProject(projectId).then((row) => {
      if (cancelled) {
        return;
      }
      if (!row) {
        setMissing(true);
        return;
      }
      setProject(row);
      setZoom(row.workspaceZoom ?? 1);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, setZoom]);

  useEffect(() => {
    if (!project?.map?.uploadedImageId) {
      return;
    }
    void loadImage(project.map.uploadedImageId).then((blob) => {
      if (blob) {
        setImageUrl(URL.createObjectURL(blob));
      }
    });
  }, [project?.map?.uploadedImageId]);

  useEffect(() => {
    if (!project) {
      return;
    }
    let alive = true;
    const timer = globalThis.setTimeout(() => {
      if (!alive) {
        return;
      }
      setSaveState("saving");
      void saveProject(project)
        .then(() => {
          if (alive) {
            setSaveState("saved");
          }
        })
        .catch(() => {
          if (alive) {
            setSaveState("failed");
          }
        });
    }, 400);
    return () => {
      alive = false;
      globalThis.clearTimeout(timer);
    };
  }, [project]);

  const update = useCallback((next: EventProjectRecord) => {
    const previous = projectRef.current;
    if (previous) {
      setHistory((stack) => [...stack.slice(-20), previous]);
    }
    setProject(next);
  }, []);

  const osmFetchKey = useMemo(() => {
    if (!project || !canEnterLayout(project.venuePolygon, project.accessPoints)) {
      return "";
    }
    if (!shouldFetchOsmObstacles(project.map, project.venuePolygon)) {
      return project.map?.provider === "image" ? "skip-image" : "";
    }
    return JSON.stringify({
      lockedAt: project.map?.lockedAt,
      zoom: project.map?.zoom,
      center: project.map?.center,
      heading: project.map?.heading,
      poly: project.venuePolygon,
    });
  }, [project]);

  useEffect(() => {
    const row = projectRef.current;
    if (!row || !canEnterLayout(row.venuePolygon, row.accessPoints)) {
      return;
    }
    if (osmFetchKey === "skip-image") {
      setOsmStatus("skipped");
      return;
    }
    if (!osmFetchKey || !row.map) {
      setOsmStatus("idle");
      return;
    }
    const map = row.map;
    const polygon = row.venuePolygon;
    const ac = new AbortController();
    let alive = true;
    setOsmStatus("loading");
    void fetchVenueOsmObstacles(map, polygon, ac.signal)
      .then((items) => {
        if (!alive) {
          return;
        }
        const merged = mergeObstacleConfirmation(items, projectRef.current?.obstacles);
        setOsmStatus(merged.length ? "ready" : "empty");
        const latest = projectRef.current;
        if (!latest) {
          return;
        }
        const prevKey = (latest.obstacles ?? []).map((item) => `${item.osmId}:${item.confirmed}`).join("|");
        const nextKey = merged.map((item) => `${item.osmId}:${item.confirmed}`).join("|");
        if (prevKey === nextKey) {
          return;
        }
        setProject({ ...latest, obstacles: merged, updatedAt: new Date().toISOString() });
      })
      .catch((error: unknown) => {
        if (!alive || (error instanceof Error && error.name === "AbortError")) {
          return;
        }
        setOsmStatus("error");
      });
    return () => {
      alive = false;
      ac.abort();
    };
  }, [osmFetchKey]);

  function undoVenue() {
    setHistory((stack) => {
      const previous = stack[stack.length - 1];
      if (previous) {
        setProject(previous);
        setVenueHint("마지막 작업을 취소했습니다.");
      }
      return stack.slice(0, -1);
    });
  }

  function deleteVenueItem() {
    const currentProject = projectRef.current;
    if (!currentProject) {
      return;
    }
    if (selectedId && currentProject.accessPoints.some((item) => item.id === selectedId)) {
      update({
        ...currentProject,
        accessPoints: currentProject.accessPoints.filter((item) => item.id !== selectedId),
        updatedAt: new Date().toISOString(),
      });
      setSelectedIds([]);
      setVenueHint("선택한 출입구를 삭제했습니다.");
      return;
    }
    if (currentProject.accessPoints.length > 0) {
      update({
        ...currentProject,
        accessPoints: currentProject.accessPoints.slice(0, -1),
        updatedAt: new Date().toISOString(),
      });
      setVenueHint("마지막 출입구를 삭제했습니다.");
      return;
    }
    if (currentProject.venuePolygon.length > 0) {
      update({
        ...currentProject,
        venuePolygon: currentProject.venuePolygon.slice(0, -1),
        updatedAt: new Date().toISOString(),
      });
      setVenueHint("마지막 영역 점을 삭제했습니다.");
      return;
    }
    setVenueHint("삭제할 점이나 출입구가 없습니다.");
  }

  const onAgents = useCallback((nextAgents: Agent[], hits: number[][]) => {
    setAgents(nextAgents);
    const cells: HeatCell[] = [];
    hits.forEach((row, r) => {
      row.forEach((density, c) => {
        if (density > 0) {
          cells.push({ x: (c + 0.5) / 20, y: (r + 0.5) / 20, density });
        }
      });
    });
    setHeat(cells);
  }, []);

  if (missing) {
    return (
      <main className="p-8">
        <p>프로젝트를 찾지 못했습니다.</p>
        <Link to="/">처음으로</Link>
      </main>
    );
  }
  if (!project) {
    return <main className="p-8">불러오는 중…</main>;
  }
  if (projectId && !unlocked(projectId) && !opened) {
    return (
      <main className="mx-auto max-w-sm p-8">
        <h1 className="text-lg font-semibold">{project.title}</h1>
        <form
          className="mt-4 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void verifyEditPassword(gate, project.passwordSalt, project.passwordHash).then(async (ok) => {
              if (!ok) {
                const next = fails + 1;
                setFails(next);
                await new Promise((r) => setTimeout(r, Math.min(2000, 400 * next)));
                setGateError("비밀번호가 올바르지 않습니다.");
                return;
              }
              sessionStorage.setItem(`eventlab-unlock:${project.id}`, "1");
              setOpened(true);
            });
          }}
        >
          <input className="w-full rounded border px-3 py-2" type="password" value={gate} onChange={(e) => setGate(e.target.value)} />
          {gateError ? <p className="text-sm text-red-700">{gateError}</p> : null}
          <button className="rounded bg-gray-900 px-3 py-2 text-sm text-white" type="submit">
            열기
          </button>
        </form>
      </main>
    );
  }

  const layoutOk = canEnterLayout(project.venuePolygon, project.accessPoints);
  const venueReason = validateVenue(project.venuePolygon, project.accessPoints);
  const current = project;
  const aspect = project.map?.frameAspectRatio ?? 16 / 9;
  const baseWidth = project.map?.baseViewport.width ?? 1280;
  const baseHeight = project.map?.baseViewport.height ?? Math.round(1280 / aspect);
  const frame = { x: 0, y: 0, width: baseWidth, height: baseHeight };
  const isCustomLayout = (project.layoutRules?.pattern ?? "custom") === "custom";
  const canManual = isCustomLayout || Boolean(project.selectedCandidateId);
  const selectedBooth = project.booths.find((item) => item.id === selectedId) ?? project.booths[0];

  function changeSelectedBooth(booth: ProgramBooth) {
    update({
      ...current,
      booths: current.booths.map((item) => (item.id === booth.id ? booth : item)),
      updatedAt: new Date().toISOString(),
    });
  }

  function go(next: StepId) {
    if ((next === "layout" || next === "results") && !layoutOk) {
      setStep("venue");
      setVenueHint(venueReason ?? UI_COPY.accessRequired);
      return;
    }
    setStep(next);
  }

  function lockMap(map: LockedMapState) {
    update({ ...current, map, updatedAt: new Date().toISOString() });
  }

  function relock() {
    const hasLayout = current.booths.some((booth) => booth.position);
    if (hasLayout && !confirm("지도를 다시 설정하면 이후 배치 위치가 어긋날 수 있습니다. 계속할까요?")) {
      return;
    }
    update({ ...current, map: undefined, updatedAt: new Date().toISOString() });
  }

  function addPoly(point: NormalizedPoint) {
    setVenueHint(`영역 점 ${current.venuePolygon.length + 1}개. 3개 이상이면 입구·출구를 찍을 수 있습니다.`);
    update({ ...current, venuePolygon: [...current.venuePolygon, point], updatedAt: new Date().toISOString() });
  }

  function moveVertex(index: number, point: NormalizedPoint) {
    const venuePolygon = current.venuePolygon.map((item, i) => (i === index ? point : item));
    update({ ...current, venuePolygon, updatedAt: new Date().toISOString() });
  }

  function placeAccess(point: NormalizedPoint) {
    if (current.venuePolygon.length < 3) {
      setVenueHint("먼저 영역 그리기로 점 3개 이상을 찍어 주세요. 그다음 입구·출구를 찍습니다.");
      return;
    }
    const snapped = snapToPolygon(point, current.venuePolygon);
    const role = tool === "exit" ? "exit" : "entrance";
    const item: AccessPoint = {
      id: crypto.randomUUID(),
      position: snapped.point,
      roles: [role],
      flowShare: 1,
      label: role === "entrance" ? `입구 ${current.accessPoints.length + 1}` : `출구 ${current.accessPoints.length + 1}`,
    };
    setVenueHint(role === "entrance" ? "입구를 넣었습니다." : "출구를 넣었습니다.");
    update({ ...current, accessPoints: [...current.accessPoints, item], updatedAt: new Date().toISOString() });
  }

  function moveBooth(id: string, point: NormalizedPoint) {
    if (!canManual) {
      return;
    }
    const booths = current.booths.map((booth) => (booth.id === id ? { ...booth, position: point } : booth));
    const selected = current.candidates.find((item) => item.id === current.selectedCandidateId);
    const candidates = selected
      ? current.candidates.map((item) =>
          item.id === selected.id ? rescoreCandidate({ ...item, booths }, current.accessPoints) : item,
        )
      : current.candidates;
    update({ ...current, booths, candidates, updatedAt: new Date().toISOString() });
  }

  function placeBooth(point: NormalizedPoint) {
    if (!isCustomLayout || !selectedId) {
      return;
    }
    if (!pointInPolygon(point, current.venuePolygon)) {
      return;
    }
    const booths = current.booths.map((booth) =>
      booth.id === selectedId ? { ...booth, position: point, size: booth.size ?? DEFAULT_BOOTH_SIZE } : booth,
    );
    update({ ...current, booths, updatedAt: new Date().toISOString() });
  }

  function orientBooth(facing: "landscape" | "portrait") {
    const targetId = selectedId ?? selectedBooth?.id;
    if (!targetId) {
      return;
    }
    const target = current.booths.find((booth) => booth.id === targetId);
    if (!target?.position) {
      return;
    }
    const next = setBoothOrientation(target, facing);
    if (!selectedId) {
      setSelectedIds([targetId]);
    }
    const booths = current.booths.map((booth) => (booth.id === targetId ? next : booth));
    update({ ...current, booths, updatedAt: new Date().toISOString() });
  }

  function chooseCandidate(candidate: LayoutCandidate) {
    update({
      ...current,
      selectedCandidateId: candidate.id,
      booths: candidate.booths,
      updatedAt: new Date().toISOString(),
    });
  }

  function persistWorkspaceZoom(next: number) {
    setZoom(next);
    const row = projectRef.current;
    if (!row || row.workspaceZoom === next) {
      return;
    }
    setProject({ ...row, workspaceZoom: next, updatedAt: new Date().toISOString() });
  }

  function hideObstacle(id: string) {
    const row = current;
    update({
      ...row,
      obstacles: (row.obstacles ?? []).map((item) => (item.id === id ? { ...item, confirmed: false } : item)),
      updatedAt: new Date().toISOString(),
    });
  }

  function runLayout() {
    const rules = current.layoutRules ?? DEFAULT_LAYOUT_RULES;
    if (rules.pattern === "custom" || layoutBusy) {
      return;
    }
    setLayoutBusy(true);
    setLayoutError("");
    window.setTimeout(() => {
      const result = generateLayoutCandidates({
        venuePolygon: current.venuePolygon,
        accessPoints: current.accessPoints,
        booths: current.booths,
        optionalFacilities: current.optionalFacilities,
        obstacles: current.obstacles,
        rules,
        purpose: current.purpose,
      });
      if (!result.candidates.length) {
        setLayoutError(result.failureReason ?? UI_COPY.autoLayoutFail);
        setLayoutBusy(false);
        return;
      }
      update({
        ...current,
        layoutRules: rules,
        candidates: result.candidates,
        selectedCandidateId: undefined,
        booths: current.booths.map((booth) => ({ ...booth, position: undefined })),
        updatedAt: new Date().toISOString(),
      });
      setLayoutBusy(false);
    }, 20);
  }

  const showHeat = step === "results";

  return (
    <PlaceSessionHost
      project={project}
      workspaceZoom={zoom}
      onWorkspaceZoom={persistWorkspaceZoom}
      onLock={lockMap}
      onRelockRequest={relock}
      mapHost={mapHost}
    >
      {(place) => (
    <div className="flex min-h-[calc(100vh-53px)] flex-col">
      <div className="flex items-center justify-between border-b bg-white px-3 py-2 text-sm">
        <nav className="flex gap-2">
          {STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded px-2 py-1 ${step === item.id ? "bg-gray-900 text-white" : "bg-gray-100"} ${
                (item.id === "layout" || item.id === "results") && !layoutOk ? "opacity-50" : ""
              }`}
              title={(item.id === "layout" || item.id === "results") && !layoutOk ? (venueReason ?? UI_COPY.accessRequired) : undefined}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <span className="shrink-0 text-xs text-gray-500">
          {saveState === "saving" ? "저장 중" : saveState === "saved" ? "저장됨" : saveState === "failed" ? "저장 실패" : ""}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="overflow-auto border-r bg-gray-50 p-3">
          {step === "place" ? <PlaceSearchPane session={place} /> : null}
          {step === "venue" ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-1">
                {(["polygon", "entrance", "exit", "select"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded border px-2 py-1 ${tool === item ? "bg-gray-900 text-white" : "bg-white"}`}
                    onClick={() => setTool(item)}
                  >
                    {item === "polygon" ? "영역 그리기" : item === "entrance" ? "입구" : item === "exit" ? "출구" : "선택"}
                  </button>
                ))}
                <button type="button" className="rounded border bg-white px-2 py-1 disabled:opacity-40" disabled={history.length === 0} onClick={undoVenue}>
                  실행 취소
                </button>
                <button type="button" className="rounded border bg-white px-2 py-1" onClick={deleteVenueItem}>
                  삭제
                </button>
              </div>
              <p className="text-gray-700">가운데 회색 화면을 클릭하세요. 지도 이미지가 없어도 그릴 수 있습니다.</p>
              <p>{venueHint || venueReason || "영역과 출입구를 지정하세요."}</p>
            </div>
          ) : null}
          {step === "programs" ? <ProgramsPanel booths={project.booths} selectedId={selectedId} onSelect={(id) => setSelectedIds([id])} onChangeBooth={(booth) => update({ ...project, booths: project.booths.map((item) => (item.id === booth.id ? booth : item)), updatedAt: new Date().toISOString() })} /> : null}
          {step === "layout" ? (
            <LayoutPanel
              project={project}
              onProject={update}
              selectedId={selectedId}
              onSelect={(id) => setSelectedIds([id])}
              error={layoutError}
              onGapPreview={setGapPreview}
              osmStatus={osmStatus}
              onHideObstacle={hideObstacle}
            />
          ) : null}
          {step === "results" ? <SimPanel project={project} onAgents={onAgents} /> : null}
        </aside>
        <section className="min-h-[360px]">
          <FrameStage
            aspect={aspect}
            baseWidth={baseWidth}
            baseHeight={baseHeight}
            workspaceZoom={zoom}
            heading={place.heading}
            mapLayer={
              <>
                {imageUrl ? <img alt="행사장 도면" src={imageUrl} className="pointer-events-none absolute inset-0 h-full w-full object-contain" /> : null}
                <div ref={mapHost} className={`absolute inset-0 ${step === "place" ? "" : "pointer-events-none"}`} />
              </>
            }
          >
            {() => (
              <div className={`relative h-full w-full ${step === "place" ? "pointer-events-none" : "pointer-events-auto"}`}>
                <EditorOverlay
                    frame={frame}
                    polygon={project.venuePolygon}
                    accessPoints={project.accessPoints}
                    booths={project.booths}
                    facilities={project.optionalFacilities}
                    agents={step === "results" ? agents : []}
                    heat={heat}
                    showHeat={showHeat}
                    tool={tool}
                    drawing={step === "venue"}
                    selectedId={selectedId}
                    onPolygonPoint={addPoly}
                    onMoveVertex={moveVertex}
                    onPlaceAccess={placeAccess}
                    onSelect={(id) => setSelectedIds([id])}
                    onMoveBooth={canManual && step === "layout" ? moveBooth : undefined}
                    onPlaceBooth={isCustomLayout && step === "layout" ? placeBooth : undefined}
                    gapPreview={step === "layout" && !isCustomLayout ? gapPreview : null}
                    obstacles={step === "layout" || step === "results" ? project.obstacles : undefined}
                  />
              </div>
            )}
          </FrameStage>
        </section>
        <aside className="flex h-full min-h-0 flex-col overflow-auto border-l bg-white p-3 text-sm">
          <p className="font-semibold">{project.title}</p>
          {step === "place" ? (
            <div className="mt-3">
              <PlaceActionsPane session={place} />
            </div>
          ) : null}
          {step === "programs" ? (
            selectedBooth ? <ProgramsFields booth={selectedBooth} onChangeBooth={changeSelectedBooth} /> : <p className="mt-2">프로그램이 없습니다.</p>
          ) : null}
          {step === "layout" ? (
            <div className="mt-3 space-y-3">
              {!isCustomLayout
                ? project.candidates.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`block w-full rounded border px-2 py-2 text-left ${project.selectedCandidateId === item.id ? "border-gray-900 bg-gray-900 text-white" : "bg-white"}`}
                      onClick={() => chooseCandidate(item)}
                    >
                      {item.label}안 · 종합 {item.score.total.toFixed(2)} (추정)
                      <span className="block text-xs opacity-80">{item.strengths[0]}</span>
                    </button>
                  ))
                : null}
              {!isCustomLayout ? (
                <button
                  type="button"
                  className="w-full rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
                  disabled={layoutBusy}
                  onClick={runLayout}
                >
                  {layoutBusy ? "만드는 중…" : UI_COPY.autoLayoutStart}
                </button>
              ) : null}
              {(() => {
                if (!selectedBooth?.position) {
                  return <p className="text-gray-600">{UI_COPY.boothRotateHint}</p>;
                }
                const facing = boothFacing(selectedBooth);
                return (
                  <div>
                    <p className="text-gray-600">{UI_COPY.boothRotateHint}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className={`flex-1 rounded border px-2 py-1 ${facing === "landscape" ? "bg-gray-900 text-white" : "bg-white"}`}
                        onClick={() => orientBooth("landscape")}
                      >
                        가로
                      </button>
                      <button
                        type="button"
                        className={`flex-1 rounded border px-2 py-1 ${facing === "portrait" ? "bg-gray-900 text-white" : "bg-white"}`}
                        onClick={() => orientBooth("portrait")}
                      >
                        세로
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
          <div className="mt-auto pt-6 text-right text-xs text-gray-600">
            <p>
              {layoutOk
                ? "배치·결과에서 후보안과 동선 추정치를 볼 수 있습니다."
                : `배치·결과는 ${venueReason ?? UI_COPY.accessRequired}`}
            </p>
            <p className="mt-2 text-gray-500">{UI_COPY.resultDisclaimer}</p>
          </div>
        </aside>
      </div>
    </div>
      )}
    </PlaceSessionHost>
  );
}
