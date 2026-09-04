/** 핵심 화면 문구. 이후 UI는 이 문자열을 그대로 쓴다. */
export const UI_COPY = {
  mapBeforeLock: "행사장이 모두 들어오도록 범위를 맞춰주세요.",
  mapRotateHint: "왼쪽·오른쪽 15° 버튼이나 슬라이더로 돌리세요. Shift 또는 오른쪽 버튼 드래그도 됩니다.",
  mapLockAction: "이 범위로 지도 고정",
  mapAfterLock: "장소 범위가 고정되었습니다. 작업 화면 확대는 장소 범위를 바꾸지 않습니다.",
  accessRequired: "입구 1개와 출구 1개를 지정해야 배치를 만들 수 있어요.",
  autoLayoutStart: "행사구성 LAB 배치안 작성",
  autoLayoutFail: "현재 영역과 통로 폭으로는 모든 부스를 배치할 수 없습니다.",
  analysisBefore: "설명을 바탕으로 필요한 운영조건을 제안해드려요. 확인한 항목만 반영됩니다.",
  analysisRule: "AI 연결 없이 기본 규칙으로 분석한 결과입니다.",
  resultDisclaimer: "이 결과는 배치안 비교를 위한 추정치이며 법정 안전검토를 대체하지 않습니다.",
  customPlaceHint: "프로그램을 고른 뒤 영역 안을 클릭해 놓으세요.",
  boothRotateHint: "부스를 고른 뒤 가로·세로를 누르면 방향이 바뀝니다.",
  osmLoading: "선택한 영역의 건물·장애물을 확인하고 있어요.",
  osmEmpty: "선택한 영역에서 OSM 장애물을 찾지 못했습니다. 기존처럼 배치할 수 있어요.",
  osmFail: "지도 장애물을 불러오지 못했습니다. 기존 배치·시뮬은 그대로 쓸 수 있어요.",
  osmSkip: "위경도가 없는 이미지 지도에서는 OSM 장애물을 건너뜁니다.",
  osmCredit: "지도 데이터 © OpenStreetMap contributors",
  osmHideHint: "현장과 다른 부분 수정",
} as const;

export const CREATE_FORM_FIELDS = [
  "행사 제목",
  "편집 비밀번호",
  "예상 참여 인원",
  "부스 개수",
  "행사 목적",
] as const;

export const LAYOUT_PATTERNS = [
  { id: "custom", label: "사용자 지정" },
  { id: "linear", label: "일자형" },
  { id: "facing-rows", label: "마주보기형" },
  { id: "u-shape", label: "U자형" },
  { id: "islands", label: "아일랜드형" },
] as const;
