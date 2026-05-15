import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../app/AppDataContext";
import { SectionTitle } from "../components/common/SectionTitle";
import { AnalysisResultCard } from "../components/upload/AnalysisResultCard";
import { ImagePreview } from "../components/upload/ImagePreview";
import type { AnalysisResult } from "../types/analysis";

const mockUploadResult: AnalysisResult = {
  id: "upload-analysis-001",
  deviceId: "device-003",
  waterLevel: 82,
  status: "DANGER",
  riskScore: 91,
  confidence: 0.89,
  reason: "수위가 위험 기준선에 근접했고 최근 수위 상승 추세가 감지되었습니다.",
  recommendedAction: "촬영 주기를 5분으로 단축하고 현장 점검을 진행하세요.",
  capturedAt: "2026-05-15 11:00",
};

export function ImageUploadPage() {
  const { devices } = useAppData();
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <SectionTitle title="테스트 이미지 업로드" description="실제 API 호출 없이 선택 이미지와 mock AI 분석 결과를 확인합니다." />
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
            disabled={!file}
            onClick={() => setResult({ ...mockUploadResult, deviceId: selectedDeviceId, id: `upload-${Date.now()}` })}
            className="w-full rounded-md bg-aqua px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            분석 요청
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <ImagePreview previewUrl={previewUrl} />
        {result ? <AnalysisResultCard result={result} /> : null}
      </section>
    </div>
  );
}
