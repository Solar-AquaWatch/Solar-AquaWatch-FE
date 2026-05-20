import { useLocation } from "react-router-dom";
import { useAppData } from "../../app/AppDataContext";

const pageTitles: Record<string, string> = {
  "/dashboard": "통합 대시보드",
  "/devices": "장치 목록",
  "/upload": "테스트 이미지 분석",
  "/solar": "태양광 운영 추천",
  "/alerts": "위험 알림",
};

export function Header() {
  const location = useLocation();
  const { selectedInstitution } = useAppData();
  const title =
    pageTitles[location.pathname] ?? (location.pathname.startsWith("/devices/") ? "장치 상세" : "Solar AquaWatch AX");

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="flex flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Solar AquaWatch AX</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-slate-950">{title}</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {selectedInstitution?.name} 기준으로 수로 카메라, AI 수위 분석, 태양광 운영 상태를 관리합니다.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            2026-05-15 11:00 KST
          </div>
        </div>
      </div>
    </header>
  );
}
