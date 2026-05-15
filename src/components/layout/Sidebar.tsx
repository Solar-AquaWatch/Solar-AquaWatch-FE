import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/devices", label: "장치 목록" },
  { to: "/upload", label: "이미지 분석" },
  { to: "/solar", label: "태양광 운영" },
  { to: "/alerts", label: "위험 알림" },
];

export function Sidebar() {
  return (
    <aside className="border-b border-slate-200 bg-ink text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Admin Console</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal">Solar AquaWatch AX</h2>
        </div>
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-3 text-sm font-semibold transition",
                  isActive ? "bg-white text-ink shadow-sm" : "text-slate-200 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-200 lg:block">
          <p className="font-semibold text-white">MVP 운영 흐름</p>
          <p className="mt-2 leading-6">대시보드 확인, 장치 등록, 테스트 이미지 분석, 추천 촬영 주기, 알림 처리까지 mock 상태로 연결됩니다.</p>
        </div>
      </div>
    </aside>
  );
}
