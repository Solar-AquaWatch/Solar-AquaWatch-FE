interface RecommendationCardProps {
  title: string;
  interval: string;
  mode: string;
  action: string;
}

export function RecommendationCard({ title, interval, mode, action }: RecommendationCardProps) {
  return (
    <div className="rounded-lg border border-teal-200 bg-white p-5 shadow-panel">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{title}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-4">
          <p className="text-sm text-slate-500">추천 촬영 주기</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{interval}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-4">
          <p className="text-sm text-slate-500">운영 모드</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{mode}</p>
        </div>
      </div>
      <p className="mt-4 rounded-md border border-teal-100 bg-teal-50 p-3 text-sm font-semibold leading-6 text-teal-950">{action}</p>
    </div>
  );
}
