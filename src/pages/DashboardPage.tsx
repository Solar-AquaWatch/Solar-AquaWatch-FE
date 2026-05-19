import { Link } from "react-router-dom";
import { useAppData } from "../app/AppDataContext";
import { RecommendationCard } from "../components/dashboard/RecommendationCard";
import { RecentImageCard } from "../components/dashboard/RecentImageCard";
import { SummaryCard } from "../components/dashboard/SummaryCard";
import { WaterLevelChart } from "../components/dashboard/WaterLevelChart";
import { SectionTitle } from "../components/common/SectionTitle";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import { combinedWaterLevelHistory } from "../mocks/waterLevelHistory";
import { solarPredictions } from "../mocks/solarPredictions";
import { getSolarRecommendation } from "../utils/solarRecommendation";
import { periodLabel, weatherLabel } from "../utils/status";

export function DashboardPage() {
  const { devices, alerts } = useAppData();
  const dangerDevice = devices.find((device) => device.latestWaterStatus === "DANGER") ?? devices[0];
  const activeAlerts = alerts.filter((alert) => !alert.isResolved);
  const latestSolar = solarPredictions.find((prediction) => prediction.deviceId === dangerDevice?.id) ?? solarPredictions[0];
  const solarRecommendation = getSolarRecommendation(latestSolar);

  const normalCount = devices.filter((device) => device.latestWaterStatus === "NORMAL").length;
  const warningCount = devices.filter((device) => device.latestWaterStatus === "WARNING").length;
  const dangerCount = devices.filter((device) => device.latestWaterStatus === "DANGER").length;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="전체 장치" value={devices.length} />
        <SummaryCard label="정상 장치" value={normalCount} tone="green" />
        <SummaryCard label="주의 장치" value={warningCount} tone="amber" />
        <SummaryCard label="위험 장치" value={dangerCount} tone="red" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <SectionTitle title="수위 변화 그래프" description="최근 위험도가 높은 장치의 수위와 위험도 흐름입니다." />
          <WaterLevelChart data={combinedWaterLevelHistory} />
        </div>
        <div>
          <SectionTitle title="최근 촬영 이미지" description="대시보드에서 바로 확인하는 최신 수로 상태입니다." />
          {dangerDevice ? (
            <RecentImageCard imageUrl={dangerDevice.latestImageUrl} title={dangerDevice.name} caption={`${dangerDevice.location} · ${dangerDevice.latestAnalysis.capturedAt}`} />
          ) : (
            <EmptyState title="등록된 장치가 없습니다" description="장치 목록에서 수로 카메라 장치를 먼저 등록해주세요." />
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel xl:col-span-2">
          <SectionTitle title="최근 위험 알림" description="미처리 알림은 현장 점검 후 처리 완료로 변경할 수 있습니다." />
          <div className="space-y-3">
            {activeAlerts.slice(0, 3).map((alert) => (
              <Link key={alert.id} to="/alerts" className="block rounded-md border border-slate-200 p-4 transition hover:border-red-300">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={alert.type} />
                  <StatusBadge value={alert.waterStatus} />
                </div>
                <p className="mt-2 font-bold text-ink">{alert.message}</p>
                <p className="mt-1 text-sm text-slate-500">{alert.deviceName} · {alert.createdAt}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <SectionTitle title="태양광·배터리 상태" />
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">날씨</dt>
              <dd className="font-bold text-ink">{weatherLabel[latestSolar.weather]}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">시간대</dt>
              <dd className="font-bold text-ink">{periodLabel[latestSolar.period]}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">발전 예측</dt>
              <dd className="font-bold text-ink">{solarRecommendation.generationForecast}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">배터리</dt>
              <dd className="font-bold text-ink">{latestSolar.batteryLevel}%</dd>
            </div>
          </dl>
        </div>
      </section>

      <RecommendationCard
        title="권장 조치"
        interval={solarRecommendation.recommendedInterval}
        mode={solarRecommendation.operationMode}
        action={dangerDevice?.latestAnalysis.recommendedAction ?? "장치가 등록되면 분석 결과를 기준으로 권장 조치가 표시됩니다."}
      />
    </div>
  );
}
