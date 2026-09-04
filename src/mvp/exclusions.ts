export const MVP_EXCLUSIONS = [
  { id: "auth", label: "회원가입·소셜 로그인" },
  { id: "schedule-budget", label: "날짜·예산 관리" },
  { id: "payments", label: "결제" },
  { id: "venue-3d", label: "3D 행사장" },
  { id: "realtime-collab", label: "실시간 여러 명 동시 편집" },
  { id: "furniture", label: "테이블·의자 배치" },
  { id: "safety-cert", label: "정확한 건축·소방 안전 인증" },
  { id: "photoreal-people", label: "사람 얼굴이나 실사 캐릭터 생성" },
  { id: "ai-silent-layout", label: "AI가 확인 없이 배치를 변경하는 기능" },
  { id: "kakao-skyview-default", label: "카카오 스카이뷰를 기본 배경으로 강제하는 기능" },
] as const;

export type MvpExclusionId = (typeof MVP_EXCLUSIONS)[number]["id"];

export const DEFAULT_MAP_PROVIDER = "google" as const;
export const DEFAULT_MAP_TYPE = "hybrid" as const;

/** AI 제안 좌표는 accepted인 항목만 반영한다. */
export function mergeAcceptedPositions<T extends { id: string; position?: { x: number; y: number } }>(
  current: T[],
  proposed: T[],
  acceptedIds: ReadonlySet<string>,
): T[] {
  const byId = new Map(proposed.map((item) => [item.id, item]));
  return current.map((item) => {
    const next = byId.get(item.id);
    if (!next || !acceptedIds.has(item.id)) {
      return item;
    }
    return { ...item, position: next.position };
  });
}
