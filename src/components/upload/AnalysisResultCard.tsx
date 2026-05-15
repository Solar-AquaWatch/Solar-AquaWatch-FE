import type { AnalysisResult } from "../../types/analysis";
import { StatusBadge } from "../common/StatusBadge";

interface AnalysisResultCardProps {
  result: AnalysisResult;
}

export function AnalysisResultCard({ result }: AnalysisResultCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">mock AI 분석 결과</p>
          <h3 className="mt-1 text-xl font-bold tracking-normal text-ink">수위 {result.waterLevel}%</h3>
        </div>
        <StatusBadge value={result.status} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-sm text-slate-500">위험도 점수</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{result.riskScore}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-sm text-slate-500">신뢰도</p>
          <p className="mt-1 text-2xl font-bold text-ink">{Math.round(result.confidence * 100)}%</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{result.reason}</p>
      <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold leading-6 text-red-700">{result.recommendedAction}</p>
    </div>
  );
}
