import { UI_COPY } from "../shared/copy";
import type { ProgramRequirement } from "../types/eventProject";
import { isDescriptionShort, stripFurnitureAdvice } from "./furniture";
import {
  REQUIREMENT_KEYS,
  type AiProgramAnalysis,
  type AnalysisConfidence,
  type ProgramAnalysisRequest,
  type ProgramAnalysisResult,
  type RequirementKey,
} from "./schema";

const RULE_LABEL = UI_COPY.analysisRule;

type Hit = { key: RequirementKey; level: "low" | "medium" | "high"; reason: string };

const RULES: Array<{ test: RegExp; hit: Hit }> = [
  { test: /전기|전원|콘센트|충전|노트북|모니터|조명|스피커|amp|projector|프로젝터/i, hit: { key: "power", level: "high", reason: "전자기기·전원을 쓰는 활동으로 전기 수요가 큽니다." } },
  { test: /인터넷|와이파이|wifi|온라인|키오스크|스트리밍/i, hit: { key: "internet", level: "high", reason: "연결이 필요하면 인터넷을 확보해야 합니다." } },
  { test: /급수|수도|물|세척|음료|커피|조리|손씻/i, hit: { key: "water", level: "medium", reason: "물·세척·음료가 있으면 급수 동선을 확인합니다." } },
  { test: /소음|음악|공연|마이크|확성|함성|방송/i, hit: { key: "noise", level: "high", reason: "소리 나는 프로그램은 주변 부스와 거리를 둬야 합니다." } },
  { test: /야외|우천|비\b|그늘|텐트|우산|날씨|폭염/i, hit: { key: "weather", level: "high", reason: "실외·날씨 노출이 있으면 그늘·우천 대응이 필요합니다." } },
  { test: /대기|줄|대기열|인기|체험|게임|참여/i, hit: { key: "queue-space", level: "high", reason: "체험·인기 프로그램은 대기열이 통로를 막기 쉽습니다." } },
  { test: /안전|화재|위험|칼|화기|어린이|아동|미끄/i, hit: { key: "safety", level: "high", reason: "위험 요소나 어린이 참여가 있으면 안전 관리가 필요합니다." } },
  { test: /운영|스태프|인력|안내원|진행자|자원봉사/i, hit: { key: "staff", level: "medium", reason: "진행·안내 인력이 따로 필요할 수 있습니다." } },
  { test: /안내|표지|웨이파인딩|동선|입구/i, hit: { key: "signage", level: "medium", reason: "찾는 사람이 많으면 안내표지가 필요합니다." } },
];

function defaultQuestion(req: ProgramAnalysisRequest): string {
  if (/게임|체험|워크/i.test(`${req.name} ${req.description}`)) {
    return "동시에 몇 명이 참여하나요?";
  }
  if (/공연|무대|음악/i.test(`${req.name} ${req.description}`)) {
    return "공연 시간과 관객이 모이는 방향은 어디인가요?";
  }
  return "한 번에 몇 명이 머물고, 전원·물은 쓰나요?";
}

export function analyzeProgramRules(req: ProgramAnalysisRequest): ProgramAnalysisResult {
  const blob = `${req.name} ${req.category ?? ""} ${req.description}`;
  const hits = new Map<RequirementKey, Hit>();
  for (const rule of RULES) {
    if (rule.test.test(blob) && !hits.has(rule.hit.key)) {
      hits.set(rule.hit.key, rule.hit);
    }
  }

  const requirements = REQUIREMENT_KEYS.map((key) => {
    const hit = hits.get(key);
    if (hit) {
      return { key, level: hit.level, reason: hit.reason };
    }
    return { key, level: "none" as const, reason: "입력에서 해당 조건을 특정하지 못했습니다." };
  });

  const short = isDescriptionShort(req.name, req.description);
  const confidence: AnalysisConfidence = short ? "low" : hits.size >= 3 ? "medium" : "low";
  const questions = short || hits.size === 0 ? [defaultQuestion(req)] : [];
  const warnings = stripFurnitureAdvice(
    requirements
      .filter((item) => item.key === "queue-space" && item.level !== "none")
      .map(() => "대기열이 주 통로를 막지 않도록 측면 공간이 필요합니다."),
  );

  const named = req.name.trim() || "이 프로그램";
  const summary = short
    ? `${named} 설명이 짧아 운영 조건을 확신하기 어렵습니다. 아래 질문을 보완하면 전기·대기·안전 판단을 좁힐 수 있습니다.`
    : `${named}은(는) 입력된 활동 특성을 기준으로 전기·인터넷·급수·소음·날씨·대기·안전·인력·안내 조건을 규칙으로 추정했습니다.`;

  return {
    summary,
    requirements,
    questions: stripFurnitureAdvice(questions).slice(0, 1),
    warnings,
    source: "rule",
    confidence,
    sourceLabel: RULE_LABEL,
  };
}

export function withShortDescriptionGuard(result: AiProgramAnalysis, req: ProgramAnalysisRequest): AiProgramAnalysis {
  const short = isDescriptionShort(req.name, req.description);
  const questions = stripFurnitureAdvice(result.questions);
  const warnings = stripFurnitureAdvice(result.warnings);
  if (!short) {
    return { ...result, questions, warnings };
  }
  return {
    ...result,
    summary: `확신 낮음. ${result.summary}`,
    questions: questions.length ? questions.slice(0, 1) : [defaultQuestion(req)],
    warnings,
  };
}

export function toProgramRequirements(
  analysis: Pick<ProgramAnalysisResult, "requirements" | "source">,
): ProgramRequirement[] {
  return analysis.requirements.map((item) => ({
    key: item.key,
    level: item.level,
    reason: item.reason,
    source: analysis.source,
    accepted: false,
  }));
}
