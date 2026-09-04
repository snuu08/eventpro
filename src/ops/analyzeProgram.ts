import { UI_COPY } from "../shared/copy";
import { analyzeProgramRules, toProgramRequirements, withShortDescriptionGuard } from "./analyzeLocal";
import { isDescriptionShort } from "./furniture";
import {
  aiProgramAnalysisSchema,
  programAnalysisRequestSchema,
  type ProgramAnalysisRequest,
  type ProgramAnalysisResult,
} from "./schema";

export { analyzeProgramRules, toProgramRequirements };
export type { ProgramAnalysisRequest, ProgramAnalysisResult };

const RULE_FALLBACK = UI_COPY.analysisRule;

function asResult(
  body: ProgramAnalysisResult | (ProgramAnalysisResult & Record<string, unknown>),
): ProgramAnalysisResult {
  if (body.source === "ai") {
    return body;
  }
  return {
    ...body,
    source: "rule",
    sourceLabel: body.sourceLabel ?? RULE_FALLBACK,
  };
}

/** 브라우저에서 호출. API 키를 넣지 않는다. 실패 시 규칙 기반이며 AI로 위장하지 않는다. */
export async function analyzeProgram(input: ProgramAnalysisRequest): Promise<ProgramAnalysisResult> {
  const req = programAnalysisRequestSchema.parse(input);
  try {
    const response = await fetch("/api/analyze-program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!response.ok) {
      return {
        ...analyzeProgramRules(req),
        fallbackReason: `서버 분석 실패 (${response.status})`,
      };
    }
    const json: unknown = await response.json();
    const parsed = json as ProgramAnalysisResult;
    if (parsed?.source === "ai") {
      const data = withShortDescriptionGuard(aiProgramAnalysisSchema.parse(parsed), req);
      return {
        ...data,
        source: "ai",
        confidence: isDescriptionShort(req.name, req.description) ? "low" : parsed.confidence ?? "medium",
        sourceLabel: "AI 분석",
      };
    }
    return asResult({
      ...analyzeProgramRules(req),
      ...parsed,
      source: "rule",
      sourceLabel: parsed?.sourceLabel ?? RULE_FALLBACK,
      fallbackReason: parsed?.fallbackReason ?? "AI를 쓰지 않고 규칙으로 분석했습니다.",
    });
  } catch (error) {
    return {
      ...analyzeProgramRules(req),
      fallbackReason: error instanceof Error ? `네트워크 또는 서버 오류 (${error.message})` : "네트워크 또는 서버 오류",
    };
  }
}
