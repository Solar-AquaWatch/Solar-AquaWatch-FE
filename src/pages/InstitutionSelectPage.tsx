import { useNavigate } from "react-router-dom";
import { useAppData } from "../app/AppDataContext";
import { StatusBadge } from "../components/common/StatusBadge";

export function InstitutionSelectPage() {
  const navigate = useNavigate();
  const { institutions, selectedInstitution, selectInstitution } = useAppData();

  const handleSelect = (institutionId: string) => {
    selectInstitution(institutionId);
    navigate("/dashboard");
  };

  return (
    <main className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-8">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-aqua">Solar AquaWatch AX</p>
          <h1 className="mt-4 text-4xl font-bold tracking-normal text-ink sm:text-5xl">기관을 선택하세요</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            선택한 기관의 장치, 위험 알림, 태양광 운영 상태를 기준으로 대시보드가 구성됩니다.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {institutions.map((institution) => {
            const isSelected = selectedInstitution?.id === institution.id;

            return (
              <button
                key={institution.id}
                type="button"
                onClick={() => handleSelect(institution.id)}
                className={[
                  "flex min-h-72 flex-col rounded-lg border bg-white p-5 text-left shadow-panel transition hover:-translate-y-1 hover:border-aqua",
                  isSelected ? "border-aqua ring-2 ring-cyan-100" : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-aqua">{institution.type}</p>
                    <h2 className="mt-2 text-xl font-bold tracking-normal text-ink">{institution.name}</h2>
                  </div>
                  <StatusBadge value={institution.riskLevel} />
                </div>
                <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{institution.description}</p>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <dt className="text-slate-500">지역</dt>
                    <dd className="font-bold text-ink">{institution.region}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">관리팀</dt>
                    <dd className="font-bold text-ink">{institution.manager}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">등록 장치</dt>
                    <dd className="font-bold text-ink">{institution.deviceCount}대</dd>
                  </div>
                </dl>
                <span className="mt-5 rounded-md bg-ink px-4 py-3 text-center text-sm font-bold text-white">
                  이 기관으로 진입
                </span>
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}
