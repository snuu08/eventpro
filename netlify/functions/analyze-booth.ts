import type { Config, Context } from "@netlify/functions";
import OpenAI from "openai";
import { BOOTH_ANALYSIS_JSON_SCHEMA, parseRawAnalysis } from "../../src/booth/parseAnalysis";
import { BOOTH_ANALYSIS_SYSTEM_PROMPT } from "../../src/booth/prompt";
import type { ChatMessage } from "../../src/booth/types";

interface AnalyzeRequest {
  boothCode?: unknown;
  eventName?: unknown;
  eventType?: unknown;
  messages?: unknown;
}

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const role = (item as ChatMessage).role;
    const content = asTrimmed((item as ChatMessage).content);
    if ((role === "user" || role === "assistant") && content) {
      messages.push({ role, content });
    }
  }
  return messages.slice(-10);
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const messages = parseMessages(body.messages);
  if (messages.filter((item) => item.role === "user").length === 0) {
    return Response.json({ error: "부스 설명을 입력하세요." }, { status: 400 });
  }

  const boothCode = asTrimmed(body.boothCode) || "부스";
  const eventName = asTrimmed(body.eventName) || "행사";
  const eventType = asTrimmed(body.eventType) || "기타";

  try {
    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: BOOTH_ANALYSIS_JSON_SCHEMA,
      },
      messages: [
        { role: "system", content: BOOTH_ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `행사명: ${eventName}\n행사 유형: ${eventType}\n부스 코드: ${boothCode}`,
        },
        ...messages,
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

    const analysis = parseRawAnalysis(parsed);
    if (!analysis) {
      return Response.json(
        { error: "AI 응답을 운영조건으로 바꾸지 못했습니다." },
        { status: 502 },
      );
    }

    return Response.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missingKey = /api key|authentication|401|missing/i.test(message);
    return Response.json(
      {
        error: missingKey
          ? "AI Gateway가 아직 활성화되지 않았습니다. Netlify에 한 번 배포하고 사이트에서 AI를 켜세요."
          : "부스 분석 중 오류가 발생했습니다.",
      },
      { status: missingKey ? 503 : 502 },
    );
  }
};

export const config: Config = {
  path: "/api/analyze-booth",
  method: "POST",
};
