import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../app/AppDataContext";
import { SectionTitle } from "../components/common/SectionTitle";
import { AnalysisResultCard } from "../components/upload/AnalysisResultCard";
import { ImagePreview } from "../components/upload/ImagePreview";
import type { AnalysisResult } from "../types/analysis";

export function ImageUploadPage() {
  const { devices, uploadDeviceImage, isLoading, errorMessage } = useAppData();
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [batteryLevel, setBatteryLevel] = useState("80");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!selectedDeviceId && devices[0]) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <SectionTitle title="테스트 이미지 업로드" description="선택한 장치의 이미지 업로드 API를 호출하고 백엔드 더미 분석 결과를 확인합니다." />
        <div className="space-y-5">
          <label className="block text-sm font-bold text-slate-700">
            장치 선택
            <select
              value={selectedDeviceId}
              onChange={(event) => setSelectedDeviceId(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-cyan-500"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>{device.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            배터리 잔량
            <input
              type="number"
              min="0"
              max="100"
              value={batteryLevel}
              onChange={(event) => setBatteryLevel(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            이미지 파일
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
              }}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={!file || !selectedDeviceId || isLoading}
            onClick={() => {
              if (!file) return;
              void uploadDeviceImage(selectedDeviceId, file, batteryLevel ? Number(batteryLevel) : undefined)
                .then(setResult)
                .catch(() => undefined);
            }}
            className="w-full rounded-md bg-aqua px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? "분석 요청 중" : "분석 요청"}
          </button>
          {errorMessage ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errorMessage}</p> : null}
        </div>
      </section>

      <section className="space-y-6">
        <ImagePreview previewUrl={previewUrl} />
        {result ? <AnalysisResultCard result={result} /> : null}
      </section>
    </div>
  );
}
