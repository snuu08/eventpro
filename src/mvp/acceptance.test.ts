import { describe, expect, it } from "vitest";
import { CREATE_FORM_FIELDS, LAYOUT_PATTERNS, UI_COPY } from "../shared/copy";
import { MVP_ACCEPTANCE } from "./acceptance";

describe("MVP acceptance and copy", () => {
  it("lists every final acceptance item", () => {
    expect(MVP_ACCEPTANCE).toHaveLength(24);
    expect(MVP_ACCEPTANCE.map((item) => item.id)).toContain("create-five-fields");
    expect(MVP_ACCEPTANCE.map((item) => item.id)).toContain("quality-gates");
  });

  it("locks the five create fields and five layout patterns", () => {
    expect([...CREATE_FORM_FIELDS]).toEqual([
      "행사 제목",
      "편집 비밀번호",
      "예상 참여 인원",
      "부스 개수",
      "행사 목적",
    ]);
    expect(LAYOUT_PATTERNS.map((item) => item.label)).toEqual([
      "사용자 지정",
      "일자형",
      "마주보기형",
      "U자형",
      "아일랜드형",
    ]);
  });

  it("uses the official short copy", () => {
    expect(UI_COPY.mapLockAction).toBe("이 범위로 지도 고정");
    expect(UI_COPY.analysisRule).toBe("AI 연결 없이 기본 규칙으로 분석한 결과입니다.");
    expect(UI_COPY.boothRotateHint).toBe("부스를 고른 뒤 가로·세로를 누르면 방향이 바뀝니다.");
    expect(UI_COPY.resultDisclaimer).toBe(
      "이 결과는 배치안 비교를 위한 추정치이며 법정 안전검토를 대체하지 않습니다.",
    );
  });
});
