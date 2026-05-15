export type WaterStatus = "NORMAL" | "WARNING" | "DANGER";

export interface AnalysisResult {
  id: string;
  deviceId: string;
  waterLevel: number;
  status: WaterStatus;
  riskScore: number;
  confidence: number;
  reason: string;
  recommendedAction: string;
  capturedAt: string;
}

export interface WaterLevelPoint {
  time: string;
  waterLevel: number;
  riskScore: number;
}
