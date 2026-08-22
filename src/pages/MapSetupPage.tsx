import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { EventMap } from "../maps/EventMap";
import type { MapAdapter } from "../maps/MapAdapter";
import type { GeoPoint, PlaceHit, RectBounds } from "../maps/types";
import { DEFAULT_VIEWPORT } from "../maps/types";
import { getKakaoAppKey } from "../maps/kakaoSdk";
import { useEventSession } from "../state/useEventSession";
import {
  conditionsToOverlays,
  EMPTY_CONDITIONS,
  isTinyRect,
  toRectBounds,
} from "../types/venue";
import { summarizeReadiness } from "../booth/status";
import { hardViolations, softWarnings } from "../layout/constraints";
import { shrinkBounds } from "../layout/geo";
import { placeBooths } from "../layout/placeBooths";
import { placementsToOverlays } from "../layout/placementsToOverlays";
import { recommendLayout } from "../layout/recommendLayout";
import { EMPTY_LAYOUT, WORK_PAD_M } from "../layout/types";
import { summarizeOps } from "../ops/summarizeOps";
import type { OpsLayer } from "../ops/types";
import type { ReadinessIssue } from "../booth/types";
import { reviewOps } from "../review/reviewOps";
import { BoothEditorPanel } from "./BoothEditorPanel";
import { BoothSidebar } from "./BoothSidebar";
import { LayoutPanel } from "./LayoutPanel";
import { OpsLayerBar } from "./OpsLayerBar";
import { OpsSummaryPanel } from "./OpsSummaryPanel";
import { ReadinessSummary } from "./ReadinessSummary";
import { ReviewPanel } from "./ReviewPanel";
import { SpecialFacilityDialog } from "./SpecialFacilityDialog";
import { VenueConditionPanel } from "./VenueConditionPanel";
import { isPortalTool, isPresetFacilityTool, type VenueTool } from "./venueTools";
import "./MapSetupPage.css";

export function MapSetupPage() {
  const {
    session,
    lockMap,
    unlockMap,
    setMapType,
    addPortal,
    addFacility,
    addZone,
    moveCondition,
    removeCondition,
    recordBoothUserInput,
    applyBoothAnalysis,
    updateBoothAnalysis,
    confirmBooth,
    setLayoutStyle,
    setLayoutRecommendation,
    applyLayout,
    moveBoothPlacement,
    setOpsReview,
  } = useEventSession();
  const adapterRef = useRef<MapAdapter | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceHit[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [tool, setTool] = useState<VenueTool>("select");
  const [zoneStart, setZoneStart] = useState<GeoPoint | null>(null);
  const [draftRect, setDraftRect] = useState<RectBounds | null>(null);
  const [pendingSpecial, setPendingSpecial] = useState<GeoPoint | null>(null);
  const [leftTab, setLeftTab] = useState<"booths" | "conditions" | "ops" | "review">("booths");
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [opsLayer, setOpsLayer] = useState<OpsLayer>("all");
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutNotices, setLayoutNotices] = useState<string[]>([]);
  const [overlayRevision, setOverlayRevision] = useState(0);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const mapState = session.map;
  const locked = mapState?.locked ?? false;
  const viewport = mapState?.viewport ?? DEFAULT_VIEWPORT;
  const mapType = viewport.mapType;
  const conditions = mapState?.conditions ?? EMPTY_CONDITIONS;
  const layout = session.layout ?? EMPTY_LAYOUT;
  const missingKey = !getKakaoAppKey();
  const booths = session.booths;
  const overlays = useMemo(
    () => [
      ...conditionsToOverlays(conditions),
      ...placementsToOverlays(layout.placements, layout.workBounds, conditions, booths, opsLayer),
    ],
    [booths, conditions, layout.placements, layout.workBounds, opsLayer],
  );
  const readiness = useMemo(() => summarizeReadiness(booths), [booths]);
  const opsCounts = useMemo(() => summarizeOps(booths), [booths]);
  const selectedBooth = booths.find((booth) => booth.id === selectedBoothId) ?? null;

  if (!session.draft) {
    return <Navigate to="/" replace />;
  }

  const resetDrawing = () => {
    setZoneStart(null);
    setDraftRect(null);
    setPendingSpecial(null);
  };

  const changeTool = (next: VenueTool) => {
    setTool(next);
    resetDrawing();
  };

  const onUnlock = () => {
    changeTool("select");
    unlockMap();
  };

  const openIssue = (issue: ReadinessIssue) => {
    setSelectedBoothId(issue.boothId);
    setLeftTab("booths");
  };

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    const adapter = adapterRef.current;
    if (!adapter) {
      return;
    }

    setSearching(true);
    setSearchError("");
    try {
      const hits = await adapter.searchPlaces(query);
      setResults(hits);
      if (hits.length === 0) {
        setSearchError("검색 결과가 없습니다.");
      }
    } catch {
      setResults([]);
      setSearchError("장소를 검색하지 못했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const onSelectPlace = (place: PlaceHit) => {
    adapterRef.current?.moveTo(place.lat, place.lng);
    setQuery(place.name);
    setResults([]);
    setSearchError("");
  };

  const onLock = () => {
    const adapter = adapterRef.current;
    if (!adapter) {
      return;
    }
    lockMap(adapter.getViewport());
  };

  const onMapClick = (point: GeoPoint) => {
    if (!locked) {
      return;
    }
    if (tool === "select") {
      return;
    }
    if (tool === "zone") {
      if (!zoneStart) {
        setZoneStart(point);
        return;
      }
      const bounds = toRectBounds(zoneStart, point);
      setZoneStart(null);
      setDraftRect(null);
      if (!isTinyRect(bounds)) {
        addZone(bounds.sw, bounds.ne);
      }
      return;
    }
    if (tool === "special") {
      setPendingSpecial(point);
      return;
    }
    if (isPortalTool(tool)) {
      addPortal(tool, point);
      return;
    }
    if (isPresetFacilityTool(tool)) {
      addFacility({ kind: tool, position: point });
    }
  };

  const onMapMouseMove = (point: GeoPoint) => {
    if (locked && tool === "zone" && zoneStart) {
      setDraftRect(toRectBounds(zoneStart, point));
    }
  };

  const onMarkerDragEnd = (id: string, point: GeoPoint) => {
    if (!id.startsWith("booth:")) {
      moveCondition(id, point);
      return;
    }

    const boothId = id.slice("booth:".length);
    const booth = booths.find((item) => item.id === boothId);
    const current = layout.placements.find((item) => item.boothId === boothId);
    if (!booth || !current) {
      return;
    }

    const halfLat = (current.ne.lat - current.sw.lat) / 2;
    const halfLng = (current.ne.lng - current.sw.lng) / 2;
    const next = {
      ...current,
      center: point,
      sw: { lat: point.lat - halfLat, lng: point.lng - halfLng },
      ne: { lat: point.lat + halfLat, lng: point.lng + halfLng },
    };
    const others = layout.placements.filter((item) => item.boothId !== boothId);
    const workBounds = layout.workBounds ?? adapterRef.current?.getBounds();
    if (!workBounds) {
      return;
    }

    const hard = hardViolations({ sw: next.sw, ne: next.ne }, workBounds, conditions, others);
    if (hard.length > 0) {
      setLayoutNotices([`${booth.code}: ${hard.join(" ")}`]);
      setOverlayRevision((value) => value + 1);
      return;
    }

    moveBoothPlacement(boothId, next);
    setLayoutNotices(softWarnings(booth, point, conditions, [...others, next], booths));
  };

  const onRecommendLayout = async () => {
    if (!session.draft) {
      return;
    }
    setLayoutBusy(true);
    try {
      const recommendation = await recommendLayout(session.draft.eventType, booths);
      setLayoutStyle(recommendation.style);
      setLayoutRecommendation(recommendation);
      setLayoutNotices([]);
    } finally {
      setLayoutBusy(false);
    }
  };

  const onPlaceLayout = () => {
    const adapter = adapterRef.current;
    if (!adapter || booths.length === 0) {
      return;
    }
    const mapBounds = adapter.getBounds();
    const result = placeBooths(booths, layout.style, mapBounds, conditions);
    applyLayout({
      placements: result.placements,
      workBounds: shrinkBounds(mapBounds, WORK_PAD_M),
    });
    setOpsReview(null);
    setReviewError("");
    setLayoutNotices(
      result.unplaced.length > 0
        ? [`공간 부족으로 ${result.unplaced.join(", ")} 부스를 배치하지 못했습니다.`]
        : [],
    );
    setOverlayRevision((value) => value + 1);
  };

  const onReviewOps = async () => {
    if (!session.draft || layout.placements.length === 0) {
      return;
    }
    setReviewBusy(true);
    setReviewError("");
    try {
      const next = await reviewOps(
        session.draft,
        conditions,
        booths,
        layout.style,
        layout.placements,
        layout.workBounds,
        { zoom: viewport.zoom, mapType: viewport.mapType },
      );
      setOpsReview(next);
      setLeftTab("review");
    } catch {
      setReviewError("운영 검토를 가져오지 못했습니다.");
    } finally {
      setReviewBusy(false);
    }
  };

  const onKeepCurrentLayout = () => {
    const current = session.review;
    if (!current) {
      return;
    }
    setOpsReview({
      ...current,
      alternative: null,
      comparison: null,
      alternativeApplied: false,
    });
  };

  const onApplyAlternative = () => {
    const alternative = session.review?.alternative;
    const adapter = adapterRef.current;
    if (!alternative || !adapter || booths.length === 0) {
      return;
    }
    const mapBounds = adapter.getBounds();
    const result = placeBooths(booths, alternative.style, mapBounds, conditions);
    setLayoutStyle(alternative.style);
    applyLayout({
      placements: result.placements,
      workBounds: shrinkBounds(mapBounds, WORK_PAD_M),
    });
    if (session.review) {
      setOpsReview({
        ...session.review,
        alternativeApplied: true,
      });
    }
    setLayoutNotices(
      result.unplaced.length > 0
        ? [`공간 부족으로 ${result.unplaced.join(", ")} 부스를 배치하지 못했습니다.`]
        : [],
    );
    setOverlayRevision((value) => value + 1);
  };

  const mapBlock = missingKey || mapError ? (
    <div className="map-fallback">
      <p>
        {mapError ||
          "Kakao Maps JavaScript 키가 없습니다. .env 파일에 VITE_KAKAO_MAP_APP_KEY를 설정한 뒤 개발 서버를 다시 시작하세요."}
      </p>
      <p className="map-fallback-sub">
        Kakao 개발자 콘솔에 localhost와 배포 도메인을 사이트 도메인으로 등록해야 합니다.
      </p>
    </div>
  ) : (
    <EventMap
      viewport={viewport}
      interactive={!locked}
      mapType={mapType}
      adapterRef={adapterRef}
      overlays={overlays}
      overlayDraggable={locked}
      overlayRevision={overlayRevision}
      draftRect={draftRect}
      onReady={() => setMapReady(true)}
      onError={setMapError}
      onMapClick={onMapClick}
      onMapMouseMove={onMapMouseMove}
      onMarkerDragEnd={onMarkerDragEnd}
    />
  );

  return (
    <div className="map-page">
      <header className="map-toolbar">
        {locked ? (
          <div className="map-toolbar-locked">
            <p className="map-event-name">{session.draft.name}</p>
            <ReadinessSummary readiness={readiness} onIssueClick={openIssue} />
            <button type="button" className="ghost-btn" onClick={onUnlock}>
              지도 다시 설정
            </button>
          </div>
        ) : (
          <>
            <div className="map-toolbar-row">
              <h1>어디에서 행사를 진행하나요?</h1>
              <button
                type="button"
                className="primary-btn map-lock-btn"
                onClick={onLock}
                disabled={!mapReady || Boolean(mapError)}
              >
                이 화면을 행사장으로 사용
              </button>
            </div>
            <div className="map-toolbar-row map-controls">
              <form className="place-search" onSubmit={onSearch}>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchError("");
                  }}
                  placeholder="장소 검색"
                  aria-label="장소 검색"
                  disabled={!mapReady}
                />
                <button type="submit" disabled={!mapReady || searching || !query.trim()}>
                  검색
                </button>
                {results.length > 0 ? (
                  <ul className="place-results">
                    {results.map((place) => (
                      <li key={place.id}>
                        <button type="button" onClick={() => onSelectPlace(place)}>
                          <strong>{place.name}</strong>
                          <span>{place.address}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {searchError ? <p className="search-hint">{searchError}</p> : null}
              </form>
              <div className="map-type-toggle" role="group" aria-label="지도 유형">
                <button
                  type="button"
                  className={mapType === "roadmap" ? "is-active" : undefined}
                  onClick={() => setMapType("roadmap")}
                  disabled={!mapReady}
                >
                  일반지도
                </button>
                <button
                  type="button"
                  className={mapType === "skyview" ? "is-active" : undefined}
                  onClick={() => setMapType("skyview")}
                  disabled={!mapReady}
                >
                  스카이뷰
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {locked ? (
        <div className="map-body">
          <div className="left-sidebar">
            <div className="sidebar-tabs" role="tablist" aria-label="작업 패널">
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === "booths"}
                className={leftTab === "booths" ? "is-active" : undefined}
                onClick={() => setLeftTab("booths")}
              >
                부스
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === "conditions"}
                className={leftTab === "conditions" ? "is-active" : undefined}
                onClick={() => setLeftTab("conditions")}
              >
                고정 조건
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === "ops"}
                className={leftTab === "ops" ? "is-active" : undefined}
                onClick={() => setLeftTab("ops")}
              >
                운영
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === "review"}
                className={leftTab === "review" ? "is-active" : undefined}
                onClick={() => setLeftTab("review")}
              >
                검토
              </button>
            </div>
            {leftTab === "booths" ? (
              <BoothSidebar
                booths={booths}
                selectedId={selectedBoothId}
                onSelect={setSelectedBoothId}
              />
            ) : null}
            {leftTab === "conditions" ? (
              <VenueConditionPanel
                conditions={conditions}
                tool={tool}
                onToolChange={changeTool}
                onRemove={removeCondition}
              />
            ) : null}
            {leftTab === "ops" ? (
              <OpsSummaryPanel
                counts={opsCounts}
                readiness={readiness}
                onIssueClick={openIssue}
              />
            ) : null}
            {leftTab === "review" ? (
              <ReviewPanel
                review={session.review}
                currentStyle={layout.style}
                busy={reviewBusy}
                error={reviewError}
                canReview={layout.placements.length > 0 && !missingKey && !mapError}
                onReview={onReviewOps}
                onKeepCurrent={onKeepCurrentLayout}
                onApplyAlternative={onApplyAlternative}
              />
            ) : null}
          </div>
          <div className="map-stage">
            <LayoutPanel
              style={layout.style}
              recommendation={layout.recommendation}
              busy={layoutBusy}
              notices={layoutNotices}
              canPlace={mapReady && booths.length > 0 && !missingKey && !mapError}
              canReview={layout.placements.length > 0}
              reviewBusy={reviewBusy}
              onStyleChange={setLayoutStyle}
              onRecommend={onRecommendLayout}
              onPlace={onPlaceLayout}
              onReview={onReviewOps}
            />
            {layout.placements.length > 0 ? (
              <OpsLayerBar layer={opsLayer} onChange={setOpsLayer} />
            ) : null}
            <div className="map-canvas">
              {mapBlock}
              {pendingSpecial ? (
                <SpecialFacilityDialog
                  onCancel={() => setPendingSpecial(null)}
                  onSave={(fields) => {
                    addFacility({
                      kind: "special",
                      position: pendingSpecial,
                      ...fields,
                    });
                    setPendingSpecial(null);
                  }}
                />
              ) : null}
            </div>
          </div>
          {selectedBooth ? (
            <BoothEditorPanel
              booth={selectedBooth}
              draft={session.draft}
              onClose={() => setSelectedBoothId(null)}
              onUserInput={(text) => recordBoothUserInput(selectedBooth.id, text)}
              onAnalyzed={(analysis) => applyBoothAnalysis(selectedBooth.id, analysis)}
              onUpdate={(updater) => updateBoothAnalysis(selectedBooth.id, updater)}
              onConfirm={() => confirmBooth(selectedBooth.id)}
            />
          ) : null}
        </div>
      ) : (
        <div className="map-stage">{mapBlock}</div>
      )}
    </div>
  );
}
