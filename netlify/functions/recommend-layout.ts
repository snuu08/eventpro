import type { Config, Context } from "@netlify/functions";
import OpenAI from "openai";
import { LAYOUT_STYLES } from "../../src/layout/types";

const SCHEMA = {
  name: "layout_recommendation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["style", "reason"],
    properties: {
      style: { type: "string", enum: [...LAYOUT_STYLES] },
      reason: { type: "string" },
    },
  },
} as const;

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
        {
          role: "system",
          content:
            "야외 행사 부스 배치 방식을 고른다. 반드시 aisle, zone, grid 중 하나만 고른다. 새로운 배치 유형을 만들지 않는다. 좌표는 계산하지 않는다. reason은 한국어 한두 문장.",
        },
        {
          role: "user",
          content: JSON.stringify({
            eventType: body.eventType,
            boothCount: body.boothCount,
            types: body.types,
            powerRequired: body.powerRequired,
            waitingRequired: body.waitingRequired,
            noisy: body.noisy,
            styles: {
              aisle: "중앙통로형",
              zone: "구역형",
              grid: "격자형",
            },
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    const parsed = content ? (JSON.parse(content) as { style?: string; reason?: string }) : null;
    if (!parsed || !LAYOUT_STYLES.includes(parsed.style as (typeof LAYOUT_STYLES)[number])) {
      return Response.json({ error: "추천 결과를 확인하지 못했습니다." }, { status: 502 });
    }

    return Response.json({
      recommendation: {
        style: parsed.style,
        reason: typeof parsed.reason === "string" ? parsed.reason : "",
      },
    });
  } catch {
    return Response.json({ error: "배치 추천을 가져오지 못했습니다." }, { status: 503 });
  }
};

export const config: Config = {
  path: "/api/recommend-layout",
  method: "POST",
};
