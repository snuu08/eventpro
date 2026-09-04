import { UI_COPY } from "../../shared/copy";
import { IMAGE_TYPES, WORKSPACE_ZOOM_MAX, WORKSPACE_ZOOM_MIN } from "../../shared/limits";
import type { PlaceSession } from "./usePlaceSession";

export function PlaceSearchPane({ session }: { session: PlaceSession }) {
  const { locked, googleKey, aspect, setAspect, query, setQuery, suggestions, setSuggestions, applyPlace, onRelockRequest, message, heading, rotateBy, setHeading } = session;
  return (
    <div className="space-y-3 text-sm">
      <p>{locked ? UI_COPY.mapAfterLock : UI_COPY.mapBeforeLock}</p>
      {!locked ? (
        <>
          <label className="block">
            비율
            <select className="mt-1 w-full rounded border px-2 py-1" value={String(aspect)} onChange={(e) => setAspect(Number(e.target.value))}>
              <option value={String(16 / 9)}>16:9</option>
              <option value={String(4 / 3)}>4:3</option>
              <option value="1.5">사용자 지정 3:2</option>
            </select>
          </label>
          {googleKey ? (
            <div>
              <input
                className="w-full rounded border px-2 py-1"
                value={query}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuery(value);
                  if (value.trim().length < 1) {
                    setSuggestions([]);
                  }
                }}
                placeholder="장소 검색"
              />
              {suggestions.length > 0 ? (
                <ul className="mt-1 max-h-48 overflow-auto rounded border bg-white">
                  {suggestions.map((item) => (
                    <li key={item.placeId}>
                      <button type="button" className="w-full px-2 py-1 text-left hover:bg-gray-100" onClick={() => applyPlace(item)}>
                        <span className="block">{item.name}</span>
                        <span className="block text-xs text-gray-500">{item.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-600">{UI_COPY.mapRotateHint}</p>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="rounded border bg-white px-2 py-1" onClick={() => rotateBy(-15)}>
                    왼쪽 15°
                  </button>
                  <button type="button" className="rounded border bg-white px-2 py-1" onClick={() => rotateBy(15)}>
                    오른쪽 15°
                  </button>
                  <button type="button" className="rounded border bg-white px-2 py-1" onClick={() => setHeading(0)}>
                    북쪽
                  </button>
                </div>
                <label className="block text-xs text-gray-600">
                  회전 {Math.round(heading)}°
                  <input className="mt-1 w-full" type="range" min={0} max={359} step={1} value={Math.round(heading)} onChange={(e) => setHeading(Number(e.target.value))} />
                </label>
              </div>
            </div>
          ) : (
            <p>지도 API가 설정되지 않았습니다. 오른쪽에서 행사장 도면 이미지를 올려 주세요.</p>
          )}
        </>
      ) : (
        <button type="button" className="rounded border px-3 py-2" onClick={onRelockRequest}>
          지도 다시 설정
        </button>
      )}
      {message ? <p className="text-red-700">{message}</p> : null}
    </div>
  );
}

export function PlaceActionsPane({ session }: { session: PlaceSession }) {
  const { locked, googleKey, onFile, lockGoogle, workspaceZoom, onWorkspaceZoom, imageHint } = session;
  if (locked) {
    return (
      <div className="space-y-3 text-sm">
        <label className="block">
          작업 화면 줌 {Math.round(workspaceZoom * 100)}%
          <input
            className="w-full"
            type="range"
            min={WORKSPACE_ZOOM_MIN}
            max={WORKSPACE_ZOOM_MAX}
            step={0.1}
            value={workspaceZoom}
            onChange={(e) => onWorkspaceZoom(Number(e.target.value))}
          />
        </label>
        {imageHint ? <p className="text-xs text-gray-500">도면이 프레임에 맞춰 표시됩니다.</p> : null}
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-gray-400 bg-white px-3 py-2 hover:border-gray-700 hover:bg-gray-50">
        <span className="text-lg leading-none" aria-hidden="true">
          📁
        </span>
        <span>
          {googleKey ? "도면 이미지 올리기" : "지도 API가 설정되지 않았습니다. 행사장 도면 이미지를 올려 주세요."}
        </span>
        <input
          className="sr-only"
          type="file"
          accept={IMAGE_TYPES.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void onFile(file);
            }
          }}
        />
      </label>
      {googleKey ? (
        <button type="button" className="rounded bg-gray-900 px-3 py-2 text-white" onClick={lockGoogle}>
          {UI_COPY.mapLockAction}
        </button>
      ) : null}
      <label className="block">
        작업 화면 줌 {Math.round(workspaceZoom * 100)}%
        <input
          className="w-full"
          type="range"
          min={WORKSPACE_ZOOM_MIN}
          max={WORKSPACE_ZOOM_MAX}
          step={0.1}
          value={workspaceZoom}
          onChange={(e) => onWorkspaceZoom(Number(e.target.value))}
        />
      </label>
      {imageHint ? <p className="text-xs text-gray-500">도면이 프레임에 맞춰 표시됩니다.</p> : null}
    </div>
  );
}
