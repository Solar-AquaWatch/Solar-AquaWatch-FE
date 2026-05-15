import type { AnalysisResult, WaterStatus } from "./analysis";

export type DeviceStatus = "ONLINE" | "OFFLINE" | "MAINTENANCE";

export interface Device {
  id: string;
  institutionId: string;
  name: string;
  location: string;
  description: string;
  status: DeviceStatus;
  batteryLevel: number;
  latestWaterStatus: WaterStatus;
  recommendedInterval: string;
  latestImageUrl: string;
  latestAnalysis: AnalysisResult;
}
