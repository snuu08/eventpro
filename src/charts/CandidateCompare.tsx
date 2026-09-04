import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LayoutCandidate } from "../types/eventProject";

export function CandidateCompare({ candidates }: { candidates: LayoutCandidate[] }) {
  const data = candidates.map((item) => ({
    name: item.label,
    congestion: item.score.congestion,
    walk: item.score.averageWalkingDistance,
    exit: item.score.exitAccessibility,
    total: item.score.total,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" fill="#166534" name="종합 (추정)" />
          <Bar dataKey="congestion" fill="#b91c1c" name="혼잡 (추정)" />
          <Bar dataKey="exit" fill="#1d4ed8" name="출구 (추정)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
