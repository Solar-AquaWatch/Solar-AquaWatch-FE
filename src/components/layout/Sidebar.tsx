import { NavLink, useNavigate } from "react-router-dom";
import { useAppData } from "../../app/AppDataContext";

const links = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/devices", label: "장치 목록" },
  { to: "/upload", label: "이미지 분석" },
  { to: "/solar", label: "태양광 운영" },
  { to: "/alerts", label: "위험 알림" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { selectedInstitution, clearInstitution } = useAppData();

  const handleChangeInstitution = () => {
    clearInstitution();
    navigate("/");
  };

  return (
    <aside className="border-b border-slate-200 bg-ink text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Admin Console</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal">Solar AquaWatch AX</h2>
          <p className="mt-2 text-sm font-semibold text-cyan-100">{selectedInstitution?.name}</p>
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
          <p className="font-semibold text-white">선택된 기관</p>
          <p className="mt-2 leading-6">{selectedInstitution?.region} · {selectedInstitution?.manager}</p>
          <button
            type="button"
            onClick={handleChangeInstitution}
            className="mt-4 w-full rounded-md border border-white/20 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
          >
            기관 변경
          </button>
        </div>
      </div>
    </aside>
  );
}
