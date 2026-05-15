import { useState } from "react";

interface DeviceRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; location: string; description: string }) => void;
}

export function DeviceRegisterModal({ isOpen, onClose, onSubmit }: DeviceRegisterModalProps) {
  const [form, setForm] = useState({ name: "", location: "", description: "" });

  if (!isOpen) return null;

  const canSubmit = form.name.trim() && form.location.trim() && form.description.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ink">장치 등록</h2>
            <p className="mt-1 text-sm text-slate-500">신규 ESP32-CAM 수로 장치를 local state에 추가합니다.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">
            닫기
          </button>
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit(form);
            setForm({ name: "", location: "", description: "" });
            onClose();
          }}
        >
          <label className="block text-sm font-bold text-slate-700">
            장치명
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              placeholder="예: 임시 배수로 CAM-06"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            위치
            <input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              placeholder="예: 북서측 임시 수로"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            설명
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              placeholder="장치가 감시하는 구간과 운영 목적을 입력하세요."
            />
          </label>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md bg-aqua px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            등록
          </button>
        </form>
      </div>
    </div>
  );
}
