import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppData } from "../app/AppDataContext";
import { EmptyState } from "../components/common/EmptyState";
import { SectionTitle } from "../components/common/SectionTitle";
import { StatusBadge } from "../components/common/StatusBadge";
import { RecommendationCard } from "../components/dashboard/RecommendationCard";
import { RecentImageCard } from "../components/dashboard/RecentImageCard";
import { WaterLevelChart } from "../components/dashboard/WaterLevelChart";
import type { WaterLevelPoint } from "../types/analysis";

export function DeviceDetailPage() {
  const { deviceId } = useParams();
  const { devices, alerts, getWaterLevelGraph } = useAppData();
  const [graphData, setGraphData] = useState<WaterLevelPoint[]>([]);
  const device = devices.find((item) => item.id === deviceId);

  useEffect(() => {
    if (!deviceId) return;
    void getWaterLevelGraph(deviceId).then(setGraphData);
  }, [deviceId, getWaterLevelGraph]);

  if (!device) {
    return <EmptyState title="장치를 찾을 수 없습니다" description="장치 목록으로 돌아가 다른 장치를 선택해주세요." />;
  }

  const deviceAlerts = alerts.filter((alert) => alert.deviceId === device.id);
  const analysis = device.latestAnalysis;

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link to="/devices" className="text-sm font-bold text-teal-700">장치 목록으로 이동</Link>
            <h2 className="mt-3 text-2xl font-bold tracking-normal text-slate-950">{device.name}</h2>
            <p className="mt-1 text-slate-500">{device.location}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{device.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={device.status} />
            <StatusBadge value={device.latestWaterStatus} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-sm text-slate-500">배터리 잔량</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{device.batteryLevel}%</p>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-sm text-slate-500">위험도 점수</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{analysis.riskScore}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-sm text-slate-500">신뢰도</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{Math.round(analysis.confidence * 100)}%</p>
          </div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <RecentImageCard imageUrl={device.latestImageUrl} title="최근 촬영 이미지" caption={analysis.capturedAt} />
        <div>
          <SectionTitle title="수위 변화 그래프" />
          <WaterLevelChart data={graphData} />
        </div>
      </section>

      <RecommendationCard title="최근 분석 결과와 권장 조치" interval={device.recommendedInterval} mode={analysis.status === "DANGER" ? "위험 대응 모드" : "일반 모니터링"} action={`${analysis.reason} ${analysis.recommendedAction}`} />

      <section>
        <SectionTitle title="해당 장치의 최근 알림" />
        <div className="grid gap-3">
          {deviceAlerts.length ? (
            deviceAlerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={alert.type} />
                  <StatusBadge value={alert.isResolved ? "RESOLVED" : "OPEN"} />
                </div>
                <p className="mt-2 font-bold text-slate-950">{alert.message}</p>
                <p className="mt-1 text-sm text-slate-500">{alert.createdAt}</p>
              </div>
            ))
          ) : (
            <EmptyState title="최근 알림이 없습니다" description="현재 이 장치에는 처리할 알림이 없습니다." />
          )}
        </div>
      </section>
    </div>
  );
}
