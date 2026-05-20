import { useMemo, useState } from "react";
import { useAppData } from "../app/AppDataContext";
import { SectionTitle } from "../components/common/SectionTitle";
import { StatusBadge } from "../components/common/StatusBadge";
import { solarPredictions } from "../mocks/solarPredictions";
import { getSolarRecommendation } from "../utils/solarRecommendation";
import { periodLabel, weatherLabel } from "../utils/status";

export function SolarOperationPage() {
  const { devices } = useAppData();
  const [selectedDeviceId, setSelectedDeviceId] = useState(solarPredictions[0].deviceId);
  const selectedPrediction = useMemo(
    () => solarPredictions.find((prediction) => prediction.deviceId === selectedDeviceId) ?? solarPredictions[0],
    [selectedDeviceId],
  );
  const recommendation = getSolarRecommendation(selectedPrediction);
  const selectedDevice = devices.find((device) => device.id === selectedPrediction.deviceId);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle title="촬영 주기 추천" description="태양광 발전 예측, 배터리 잔량, 수위 위험도를 조합해 운영 모드를 산출합니다." />
          <select
            value={selectedDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            className="control"
          >
            {solarPredictions.map((prediction) => {
              const device = devices.find((item) => item.id === prediction.deviceId);
              return <option key={prediction.id} value={prediction.deviceId}>{device?.name ?? prediction.deviceId}</option>;
            })}
          </select>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">날씨 상태</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{weatherLabel[selectedPrediction.weather]}</p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">시간대</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{periodLabel[selectedPrediction.period]}</p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">태양광 발전 예측</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{recommendation.generationForecast}</p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">배터리 잔량</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{selectedPrediction.batteryLevel}%</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
          <SectionTitle title="추천 결과" />
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">선택 장치</span>
              <span className="font-bold text-slate-950">{selectedDevice?.name ?? selectedPrediction.deviceId}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">수위 상태</span>
              <StatusBadge value={selectedPrediction.waterStatus} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">추천 촬영 주기</span>
              <span className="text-2xl font-bold text-teal-700">{recommendation.recommendedInterval}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">운영 모드</span>
              <span className="font-bold text-slate-950">{recommendation.operationMode}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">절전 모드</span>
              <span className="font-bold text-slate-950">{recommendation.powerSaving ? "사용" : "미사용"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
          <SectionTitle title="추천 규칙" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 pr-4">조건</th>
                  <th className="py-3 pr-4">발전 예측</th>
                  <th className="py-3 pr-4">추천 촬영 주기</th>
                  <th className="py-3">운영 모드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                <tr><td className="py-3 pr-4">맑음 + 낮 + 배터리 60% 이상</td><td>HIGH</td><td>5분</td><td>집중 모니터링</td></tr>
                <tr><td className="py-3 pr-4">흐림 또는 일조량 보통 + 배터리 30~60%</td><td>MEDIUM</td><td>15분</td><td>일반 모니터링</td></tr>
                <tr><td className="py-3 pr-4">비 또는 야간 + 배터리 30% 미만</td><td>LOW</td><td>30~60분</td><td>절전 모니터링</td></tr>
                <tr><td className="py-3 pr-4">수위 위험 감지</td><td>무관</td><td>5분</td><td>위험 대응 모드</td></tr>
                <tr><td className="py-3 pr-4">배터리 20% 미만</td><td>LOW</td><td>60분</td><td>초절전 모드</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
