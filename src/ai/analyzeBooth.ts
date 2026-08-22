import { parseRawAnalysis, toBoothAnalysis } from "../booth/parseAnalysis";
import type { BoothAnalysis, ChatMessage } from "../booth/types";

export class BoothAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoothAnalysisError";
  }
}

interface AnalyzeBoothInput {
  boothCode: string;
  eventName: string;
  eventType: string;
  messages: ChatMessage[];
}

interface AnalyzeBoothResponse {
  analysis?: unknown;
  error?: string;
}

export async function analyzeBooth(input: AnalyzeBoothInput): Promise<BoothAnalysis> {
  let response: Response;
  try {
    response = await fetch("/api/analyze-booth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new BoothAnalysisError("분석 서버에 연결하지 못했습니다.");
  }

  let payload: AnalyzeBoothResponse = {};
  try {
    payload = (await response.json()) as AnalyzeBoothResponse;
  } catch {
    throw new BoothAnalysisError("분석 응답을 읽지 못했습니다.");
  }

  if (!response.ok) {
    throw new BoothAnalysisError(payload.error || "부스 분석에 실패했습니다.");
  }

  const raw = parseRawAnalysis(payload.analysis);
  if (!raw) {
    throw new BoothAnalysisError("AI 응답이 올바르지 않아 적용하지 않았습니다.");
  }
  return toBoothAnalysis(raw);
}
