import { z } from "zod";

export const REQUIREMENT_KEYS = [
  "power",
  "internet",
  "water",
  "noise",
  "weather",
  "queue-space",
  "safety",
  "staff",
  "signage",
] as const;

export type RequirementKey = (typeof REQUIREMENT_KEYS)[number];

export const requirementLevelSchema = z.enum(["none", "low", "medium", "high"]);

export const aiRequirementSchema = z.object({
  key: z.enum(REQUIREMENT_KEYS),
  level: requirementLevelSchema,
  reason: z.string().min(1).max(400),
});

export const aiProgramAnalysisSchema = z.object({
  summary: z.string().min(1).max(800),
  requirements: z.array(aiRequirementSchema).min(1).max(9),
  questions: z.array(z.string().min(1).max(200)).max(6),
  warnings: z.array(z.string().min(1).max(400)).max(8),
});

export type AiProgramAnalysis = z.infer<typeof aiProgramAnalysisSchema>;

export const programAnalysisRequestSchema = z.object({
  name: z.string().max(80).default(""),
  description: z.string().max(4000).default(""),
  category: z.string().max(80).optional(),
  purpose: z.string().max(40).optional(),
});

export type ProgramAnalysisRequest = z.infer<typeof programAnalysisRequestSchema>;

export type AnalysisSource = "ai" | "rule";
export type AnalysisConfidence = "low" | "medium" | "high";

export type ProgramAnalysisResult = AiProgramAnalysis & {
  source: AnalysisSource;
  confidence: AnalysisConfidence;
  /** 규칙 기반일 때만. AI인 척하지 않기 위한 표시 문구 */
  sourceLabel: string;
  fallbackReason?: string;
};
