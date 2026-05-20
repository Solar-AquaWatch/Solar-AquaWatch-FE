interface SummaryCardProps {
  label: string;
  value: number | string;
  tone?: "neutral" | "green" | "amber" | "red";
}

const toneClass = {
  neutral: "border-slate-200 bg-white text-slate-950",
  green: "border-emerald-200 bg-white text-emerald-700",
  amber: "border-amber-200 bg-white text-amber-700",
  red: "border-red-200 bg-white text-red-700",
};

export function SummaryCard({ label, value, tone = "neutral" }: SummaryCardProps) {
  return (
    <div className={`rounded-lg border p-5 shadow-panel ${toneClass[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-normal">{value}</p>
      <div className="mt-4 h-1.5 rounded-full bg-slate-100">
        <div className="h-full w-2/3 rounded-full bg-current opacity-70" />
      </div>
    </div>
  );
}
