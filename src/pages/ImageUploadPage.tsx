import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../app/AppDataContext";
import { SectionTitle } from "../components/common/SectionTitle";
import { AnalysisResultCard } from "../components/upload/AnalysisResultCard";
import { ImagePreview } from "../components/upload/ImagePreview";
import type { AnalysisResult, WaterStatus } from "../types/analysis";

const AI_API_URL = import.meta.env.VITE_AI_API_URL ?? "http://localhost:8000/ai/analyze-water-level";

interface AiAnalyzeResponse {
  waterLevel: number;
  status: WaterStatus;
  riskScore: number;
  confidence: number;
  reason: string;
  recommendedAction: string;
  solarPrediction?: "HIGH" | "MEDIUM" | "LOW";
  recommendedInterval?: number;
  dataSources?: string[];
}

function toAnalysisResult(aiResult: AiAnalyzeResponse, deviceId: string): AnalysisResult {
  return {
    id: `ai-analysis-${Date.now()}`,
    deviceId,
    waterLevel: aiResult.waterLevel,
    status: aiResult.status,
    riskScore: aiResult.riskScore,
    confidence: aiResult.confidence,
    reason: aiResult.reason,
    recommendedAction: aiResult.recommendedAction,
    capturedAt: new Date().toLocaleString("ko-KR"),
    solarPrediction: aiResult.solarPrediction,
    recommendedInterval: aiResult.recommendedInterval,
    dataSources: aiResult.dataSources ?? [],
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ImageUploadPage() {
  const { devices, applyAnalysisResult } = useAppData();
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [batteryLevel, setBatteryLevel] = useState("80");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const handleAnalyze = async () => {
    if (!file || !selectedDeviceId) return;

    setIsAnalyzing(true);
    setErrorMessage("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (batteryLevel) {
        formData.append("batteryLevel", batteryLevel);
      }

      const response = await fetch(AI_API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`AI 서버 오류: ${response.status}`);
      }

      const aiResult = (await response.json()) as AiAnalyzeResponse;
      const mappedResult = toAnalysisResult(aiResult, selectedDeviceId);
      const imageDataUrl = await readFileAsDataUrl(file);

      setResult(mappedResult);
      applyAnalysisResult(selectedDeviceId, mappedResult, imageDataUrl);
    } catch (error) {
      console.error(error);
      setErrorMessage("AI 분석 서버 연결에 실패했습니다. FastAPI 서버가 켜져 있는지 확인하세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <SectionTitle
          title="테스트 이미지 업로드"
          description="업로드한 이미지를 FastAPI/OpenCV AI 서버로 전송해 수위 상태와 위험도를 분석합니다."
        />
        <div className="space-y-5">
          <label className="block text-sm font-bold text-slate-700">
            장치 선택
            <select
              value={selectedDeviceId}
              onChange={(event) => setSelectedDeviceId(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-cyan-500"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
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
                setErrorMessage("");
              }}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={!file || !selectedDeviceId || isAnalyzing}
            onClick={handleAnalyze}
            className="w-full rounded-md bg-aqua px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isAnalyzing ? "AI 분석 중..." : "분석 요청"}
          </button>

          {errorMessage ? <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{errorMessage}</p> : null}
        </div>
      </section>

      <section className="space-y-6">
        <ImagePreview previewUrl={previewUrl} />
        {result ? <AnalysisResultCard result={result} /> : null}
      </section>
    </div>
  );
}
