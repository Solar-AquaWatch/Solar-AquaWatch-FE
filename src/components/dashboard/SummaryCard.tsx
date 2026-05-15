interface SummaryCardProps {
  label: string;
  value: number | string;
  tone?: "neutral" | "green" | "amber" | "red";
}

const toneClass = {
  neutral: "border-slate-200 bg-white text-ink",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
};

export function SummaryCard({ label, value, tone = "neutral" }: SummaryCardProps) {
  return (
    <div className={`rounded-lg border p-5 shadow-panel ${toneClass[tone]}`}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-normal">{value}</p>
    </div>
  );
}
