import { RESULT_DISCLAIMER } from "./constants";
import { formatEstimate, type SimMetrics } from "./simulate";

export type SimReportLines = {
  congestionScore: string;
  averageWaitMinutes: string;
  maxWaitMinutes: string;
  averageWalkingDistance: string;
  busiestBooths: string[];
  bottlenecks: string[];
  averageExitAccessMinutes: string;
  emergencyClearMinutes?: string;
  expectedVisitors: string;
  agentCount: string;
  peoplePerAgent: string;
  disclaimer: string;
};

/** 화면·보고서용. 모든 숫자 옆에 (추정). */
export function formatSimReport(metrics: SimMetrics): SimReportLines {
  return {
    congestionScore: formatEstimate(metrics.congestionScore),
    averageWaitMinutes: formatEstimate(metrics.averageWaitMinutes, "분"),
    maxWaitMinutes: formatEstimate(metrics.maxWaitMinutes, "분"),
    averageWalkingDistance: formatEstimate(metrics.averageWalkingDistance),
    busiestBooths: metrics.busiestBooths.map(
      (booth, index) => `${index + 1}. ${booth.name} · 방문 ${formatEstimate(booth.visits, "명")}`,
    ),
    bottlenecks: metrics.bottlenecks.map(
      (cell, index) =>
        `${index + 1}. (${cell.x.toFixed(2)}, ${cell.y.toFixed(2)}) · 밀도 ${formatEstimate(cell.density)}`,
    ),
    averageExitAccessMinutes: formatEstimate(metrics.averageExitAccessMinutes, "분"),
    emergencyClearMinutes:
      metrics.emergencyClearMinutes === undefined
        ? undefined
        : formatEstimate(metrics.emergencyClearMinutes, "분"),
    expectedVisitors: formatEstimate(metrics.assumptions.expectedVisitors, "명"),
    agentCount: formatEstimate(metrics.assumptions.agentCount, "개"),
    peoplePerAgent: formatEstimate(metrics.assumptions.peoplePerAgent, "명"),
    disclaimer: RESULT_DISCLAIMER,
  };
}
