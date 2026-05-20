import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../app/AppDataContext";
import { StatusBadge } from "../components/common/StatusBadge";

export function InstitutionSelectPage() {
  const navigate = useNavigate();
  const { institutions, selectedInstitution, selectInstitution, createInstitution, isLoading, errorMessage } = useAppData();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [form, setForm] = useState({ name: "", managerName: "", phone: "", email: "", address: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (institutionId: string) => {
    void selectInstitution(institutionId).then(() => navigate("/dashboard"));
  };

  return (
    <main className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-8">
        <section className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Solar AquaWatch AX</p>
          <h1 className="mt-4 text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">기관을 선택하세요</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            선택한 기관의 장치, 위험 알림, 태양광 운영 상태를 기준으로 대시보드가 구성됩니다.
          </p>
          {errorMessage ? <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errorMessage}</p> : null}
          <button
            type="button"
            onClick={() => setIsRegisterOpen((current) => !current)}
            className="mt-5 primary-button"
          >
            기관 등록
          </button>
        </section>

        {isRegisterOpen ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
            <h2 className="text-xl font-bold tracking-normal text-slate-950">새 기관 등록</h2>
            <form
              className="mt-5 grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!form.name.trim()) return;
                setIsSubmitting(true);
                void createInstitution(form)
                  .then(() => {
                    setForm({ name: "", managerName: "", phone: "", email: "", address: "" });
                    setIsRegisterOpen(false);
                  })
                  .catch(() => undefined)
                  .finally(() => setIsSubmitting(false));
              }}
            >
              <label className="block text-sm font-bold text-slate-700">
                기관명
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full control" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                관리자
                <input value={form.managerName} onChange={(event) => setForm((current) => ({ ...current, managerName: event.target.value }))} className="mt-2 w-full control" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                연락처
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 w-full control" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                이메일
                <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 w-full control" />
              </label>
              <label className="block text-sm font-bold text-slate-700 md:col-span-2">
                주소
                <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="mt-2 w-full control" />
              </label>
              <button type="submit" disabled={!form.name.trim() || isSubmitting} className="primary-button md:col-span-2">
                {isSubmitting ? "등록 중" : "등록"}
              </button>
            </form>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          {isLoading && !institutions.length ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500 shadow-panel md:col-span-3">기관 목록을 불러오는 중입니다.</div>
          ) : null}
          {institutions.map((institution) => {
            const isSelected = selectedInstitution?.id === institution.id;

            return (
              <button
                key={institution.id}
                type="button"
                onClick={() => handleSelect(institution.id)}
                className={[
                  "flex min-h-72 flex-col rounded-lg border bg-white p-5 text-left shadow-panel transition hover:-translate-y-1 hover:border-teal-500",
                  isSelected ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{institution.type}</p>
                    <h2 className="mt-2 text-xl font-bold tracking-normal text-slate-950">{institution.name}</h2>
                  </div>
                  <StatusBadge value={institution.riskLevel} />
                </div>
                <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{institution.description}</p>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <dt className="text-slate-500">지역</dt>
                    <dd className="font-bold text-slate-950">{institution.region}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">관리팀</dt>
                    <dd className="font-bold text-slate-950">{institution.manager}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">등록 장치</dt>
                    <dd className="font-bold text-slate-950">{institution.deviceCount}대</dd>
                  </div>
                </dl>
                <span className="mt-5 rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white">
                  이 기관으로 진입
                </span>
              </button>
            );
          })}
          {!isLoading && !institutions.length ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500 md:col-span-3">
              등록된 기관이 없습니다. 기관 등록을 먼저 진행해주세요.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
