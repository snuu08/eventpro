import type { Booth } from "../booth/types";
import type { EventType } from "../types/event";
import type { LayoutRecommendation, LayoutStyle } from "./types";

export function recommendLayoutLocal(
  eventType: EventType,
  booths: Booth[],
): LayoutRecommendation {
  const types = new Set(
    booths.map((booth) => booth.analysis?.type.value).filter((value): value is NonNullable<typeof value> => Boolean(value)),
  );
  const noisy = booths.filter((booth) => booth.analysis?.noise.value === "high").length;
  const analyzed = booths.filter((booth) => booth.analysis).length;

  let style: LayoutStyle = "grid";
  let reason = "부스 성격이 단순해 격자형으로 공간을 일정하게 쓰는 편이 안전합니다.";

  if (types.size >= 3 && analyzed >= 3) {
    style = "zone";
    reason = "부스 유형이 여러 가지라 비슷한 성격끼리 모으는 구역형이 맞습니다.";
  } else if (
    booths.length >= 8 &&
    (eventType === "축제" || eventType === "플리마켓" || eventType === "박람회")
  ) {
    style = "aisle";
    reason = "부스 수가 많고 유동이 큰 행사 유형이라 중앙 통로를 확보하는 편이 낫습니다.";
  } else if (noisy >= 2 && types.has("consultation")) {
    style = "zone";
    reason = "소음 부스와 상담 부스를 나누려면 구역형이 설명하기 쉽습니다.";
  }

  return { style, reason };
}
