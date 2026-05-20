import { useState } from "react";

interface DeviceRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; serialNumber: string; locationName: string; latitude?: string; longitude?: string; batteryLevel?: number }) => Promise<void>;
}

export function DeviceRegisterModal({ isOpen, onClose, onSubmit }: DeviceRegisterModalProps) {
  const [form, setForm] = useState({ name: "", serialNumber: "", locationName: "", latitude: "", longitude: "", batteryLevel: "100" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const canSubmit = form.name.trim() && form.serialNumber.trim() && form.locationName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-slate-950">장치 등록</h2>
            <p className="mt-1 text-sm text-slate-500">신규 ESP32-CAM 수로 장치를 백엔드에 등록합니다.</p>
          </div>
          <button type="button" onClick={onClose} className="secondary-button px-3 py-2">
            닫기
          </button>
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            setIsSubmitting(true);
            void onSubmit({
              name: form.name,
              serialNumber: form.serialNumber,
              locationName: form.locationName,
              latitude: form.latitude || undefined,
              longitude: form.longitude || undefined,
              batteryLevel: form.batteryLevel ? Number(form.batteryLevel) : undefined,
            })
              .then(() => {
                setForm({ name: "", serialNumber: "", locationName: "", latitude: "", longitude: "", batteryLevel: "100" });
                onClose();
              })
              .catch(() => undefined)
              .finally(() => setIsSubmitting(false));
          }}
        >
          <label className="block text-sm font-bold text-slate-700">
            장치명
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-2 w-full control"
              placeholder="예: 임시 배수로 CAM-06"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            시리얼 번호
            <input
              value={form.serialNumber}
              onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))}
              className="mt-2 w-full control"
              placeholder="예: ESP32-CAM-0006"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            위치
            <input
              value={form.locationName}
              onChange={(event) => setForm((current) => ({ ...current, locationName: event.target.value }))}
              className="mt-2 w-full control"
              placeholder="예: 북서측 임시 수로"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-bold text-slate-700">
              위도
              <input
                value={form.latitude}
                onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                className="mt-2 w-full control"
                placeholder="37.5665"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              경도
              <input
                value={form.longitude}
                onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                className="mt-2 w-full control"
                placeholder="126.9780"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              배터리
              <input
                type="number"
                min="0"
                max="100"
                value={form.batteryLevel}
                onChange={(event) => setForm((current) => ({ ...current, batteryLevel: event.target.value }))}
                className="mt-2 w-full control"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full primary-button"
          >
            {isSubmitting ? "등록 중" : "등록"}
          </button>
        </form>
      </div>
    </div>
  );
}
