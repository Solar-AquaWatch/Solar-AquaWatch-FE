import type { AnalysisResult } from "../../types/analysis";

interface AnalysisResultCardProps {
  result: AnalysisResult;
}

function statusLabel(status: string) {
  if (status === "NORMAL") return "정상";
  if (status === "WARNING") return "주의";
  if (status === "DANGER") return "위험";
  return status;
}

function statusClass(status: string) {
  if (status === "NORMAL") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "WARNING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "DANGER") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function solarLabel(value?: string) {
  if (value === "HIGH") return "높음";
  if (value === "MEDIUM") return "보통";
  if (value === "LOW") return "낮음";
  return "미확인";
}

function solarClass(value?: string) {
  if (value === "HIGH") return "bg-yellow-50 text-yellow-700 border-yellow-200";
  if (value === "MEDIUM") return "bg-sky-50 text-sky-700 border-sky-200";
  if (value === "LOW") return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export function AnalysisResultCard({ result }: AnalysisResultCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">AI 분석 결과</p>
          <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
            수위 감지 {result.waterLevel}%
          </h3>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-sm font-extrabold ${statusClass(
            result.status
          )}`}
        >
          {statusLabel(result.status)}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">위험도 점수</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {result.riskScore}
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">신뢰도</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {Math.round(result.confidence * 100)}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">태양광 발전 가능량</p>
          <p
            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-extrabold ${solarClass(
              result.solarPrediction
            )}`}
          >
            {result.solarPrediction ?? "UNKNOWN"} · {solarLabel(result.solarPrediction)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">AI Hub surface 수위</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {result.observedWaterLevelText ?? "미감지"}
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">추천 촬영 주기</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {result.recommendedInterval ? `${result.recommendedInterval}분` : "미확인"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold text-slate-500">판단 근거</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{result.reason}</p>
      </div>

      <div className="mt-4 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
        <p className="text-xs font-bold text-cyan-700">권장 조치</p>
        <p className="mt-2 text-sm font-bold leading-6 text-cyan-900">
          {result.recommendedAction}
        </p>
      </div>

      {result.dataSources && result.dataSources.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500">데이터 출처</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {result.dataSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-slate-400">
        분석 시각: {result.capturedAt}
      </p>
    </article>
  );
}
