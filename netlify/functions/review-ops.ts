import type { Config, Context } from "@netlify/functions";
import OpenAI from "openai";
import { LAYOUT_STYLES } from "../../src/layout/types";
import { parseOpsReview } from "../../src/review/parseReview";
import { REVIEW_TOPICS } from "../../src/review/types";

const SCHEMA = {
  name: "ops_review",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "findings",
      "suggestAlternative",
      "alternativeStyle",
      "currentProblem",
      "alternativeReason",
      "comparison",
    ],
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["topic", "message"],
          properties: {
            topic: { type: "string", enum: [...REVIEW_TOPICS] },
            message: { type: "string" },
          },
        },
      },
      suggestAlternative: { type: "boolean" },
      alternativeStyle: { type: "string", enum: [...LAYOUT_STYLES, "none"] },
      currentProblem: { type: "string" },
      alternativeReason: { type: "string" },
      comparison: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["aspect", "current", "alternative"],
          properties: {
            aspect: { type: "string" },
            current: { type: "string" },
            alternative: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `야외 행사 운영을 검토한다.
사용자는 법적/안전 인증이 아니라, 확인하면 좋은 운영상 관계를 원한다.

해야 할 일:
- 전력, 대기, 급수/배수, 소음, 유형, 준비상태처럼 행사 운영에 영향을 주는 관계를 찾는다.
- 한국어로 짧게 쓴다. findings는 최대 6개.
- 부스 코드를 가능하면 언급한다.
- 좌표를 만들지 않는다. 새로운 배치 유형을 만들지 않는다.

대안 배치:
- 처음부터 A/B/C를 만들지 않는다.
- 현재 배치에서 개선 가능성이 있을 때만 suggestAlternative=true.
- 대안은 aisle, zone, grid 중 현재와 다른 하나만.
- 좌표는 추천하지 않고 배치 유형만 추천한다.
- 비교는 점수 없이 짧은 설명형 단어만 쓴다. 예: 분산 / 집중 가능.

절대 사용 금지:
- 안전합니다
- 위험하지 않습니다
- 안전점수
- 최적의 배치입니다
- 이 출구 수면 충분합니다
- 법적 기준을 충족합니다
집기/테이블/의자 총합은 다루지 않는다.`;

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const layout = body.layout as { style?: string } | undefined;
  const currentStyle = LAYOUT_STYLES.includes(layout?.style as (typeof LAYOUT_STYLES)[number])
    ? (layout?.style as (typeof LAYOUT_STYLES)[number])
    : "grid";

  try {
    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: SCHEMA,
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            currentStyle,
            currentStyleLabel: {
              aisle: "중앙통로형",
              zone: "구역형",
              grid: "격자형",
            }[currentStyle],
            data: body,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    let parsed: unknown = null;
    if (content) {
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = null;
      }
    }

    const review = parseOpsReview(parsed, currentStyle);
    if (!review) {
      return Response.json({ error: "운영 검토 결과를 확인하지 못했습니다." }, { status: 502 });
    }

    return Response.json({ review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missingKey = /api key|authentication|401|missing/i.test(message);
    return Response.json(
      {
        error: missingKey
          ? "AI Gateway가 아직 활성화되지 않았습니다. Netlify에 한 번 배포하고 사이트에서 AI를 켜세요."
          : "운영 검토 중 오류가 발생했습니다.",
      },
      { status: missingKey ? 503 : 502 },
    );
  }
};

export const config: Config = {
  path: "/api/review-ops",
  method: "POST",
};
