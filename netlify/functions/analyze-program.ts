import type { Config, Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { applyLocalEnvFiles } from "./_shared/localEnv";
import { analyzeProgramRules, withShortDescriptionGuard } from "../../src/ops/analyzeLocal";
import { isDescriptionShort, mentionsFurniture, stripFurnitureAdvice } from "../../src/ops/furniture";
import {
  aiProgramAnalysisSchema,
  programAnalysisRequestSchema,
  type ProgramAnalysisResult,
} from "../../src/ops/schema";

const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM = `당신은 학교·청소년·플리마켓·박람회 프로그램의 현장 운영조건만 분석합니다.
테이블, 의자, 가구는 질문·분석·추천에서 절대 다루지 않습니다.
JSON만 출력합니다. 마크다운 금지.
스키마:
{"summary":string,"requirements":[{"key":"power"|"internet"|"water"|"noise"|"weather"|"queue-space"|"safety"|"staff"|"signage","level":"none"|"low"|"medium"|"high","reason":string}],"questions":string[],"warnings":string[]}
requirements는 위 9개 key를 모두 포함합니다.`;

function jsonResponse(body: ProgramAnalysisResult, status = 200): Response {
  return Response.json(body, { status });
}

function extractJson(text: string): unknown {
  const fenced = text.match(/\{[\s\S]*\}/);
  if (!fenced) {
    throw new Error("no-json");
  }
  return JSON.parse(fenced[0]) as unknown;
}

function env(name: string): string | undefined {
  applyLocalEnvFiles();
  if (process.env[name]) {
    return process.env[name];
  }
  try {
    return Netlify.env.get(name) ?? undefined;
  } catch {
    return undefined;
  }
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsedReq = programAnalysisRequestSchema.safeParse(raw);
  const input = parsedReq.success ? parsedReq.data : { name: "", description: "" };
  const rules = analyzeProgramRules(input);

  const apiKey = env("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return jsonResponse({
      ...rules,
      fallbackReason: "ANTHROPIC_API_KEY가 없어 규칙 기반으로 분석했습니다.",
    });
  }

  try {
    const client = new Anthropic({
      apiKey,
      baseURL: env("ANTHROPIC_BASE_URL") || undefined,
    });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `프로그램명: ${input.name || "(없음)"}
분류: ${input.category || "(없음)"}
행사 목적: ${input.purpose || "(없음)"}
설명: ${input.description || "(없음)"}
설명이 짧으면 questions에 질문 하나만 넣고 summary에 확신 낮음을 밝히세요.`,
        },
      ],
    });
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const data = withShortDescriptionGuard(aiProgramAnalysisSchema.parse(extractJson(text)), input);
    if (data.questions.some(mentionsFurniture) || data.warnings.some(mentionsFurniture) || mentionsFurniture(data.summary)) {
      return jsonResponse({
        ...rules,
        fallbackReason: "AI 응답에 테이블·의자 안내가 포함되어 규칙 기반으로 대체했습니다.",
      });
    }
    return jsonResponse({
      summary: data.summary,
      requirements: data.requirements,
      questions: stripFurnitureAdvice(data.questions),
      warnings: stripFurnitureAdvice(data.warnings),
      source: "ai",
      confidence: isDescriptionShort(input.name, input.description) ? "low" : "medium",
      sourceLabel: "AI 분석",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    return jsonResponse({
      ...rules,
      fallbackReason: `AI 호출 또는 JSON 검증 실패로 규칙 기반입니다. (${reason})`,
    });
  }
};

export const config: Config = {
  path: "/api/analyze-program",
  method: "POST",
};
