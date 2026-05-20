import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WaterLevelPoint } from "../../types/analysis";

interface WaterLevelChartProps {
  data: WaterLevelPoint[];
}

export function WaterLevelChart({ data }: WaterLevelChartProps) {
  return (
    <div className="h-72 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 20, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} />
          <Tooltip formatter={(value) => [`${value}%`, "수위"]} contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
          <Line type="monotone" dataKey="waterLevel" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="riskScore" stroke="#dc2626" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
