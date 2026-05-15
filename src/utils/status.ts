import type { AlertType } from "../types/alert";
import type { DeviceStatus } from "../types/device";
import type { DayPeriod, WeatherStatus } from "../types/solar";
import type { WaterStatus } from "../types/analysis";

export const waterStatusLabel: Record<WaterStatus, string> = {
  NORMAL: "정상",
  WARNING: "주의",
  DANGER: "위험",
};

export const deviceStatusLabel: Record<DeviceStatus, string> = {
  ONLINE: "온라인",
  OFFLINE: "오프라인",
  MAINTENANCE: "점검중",
};

export const alertTypeLabel: Record<AlertType, string> = {
  WATER_RISK: "수위 위험",
  BATTERY_LOW: "배터리 부족",
  DEVICE_OFFLINE: "장치 오프라인",
};

export const weatherLabel: Record<WeatherStatus, string> = {
  SUNNY: "맑음",
  CLOUDY: "흐림",
  RAINY: "비",
};

export const periodLabel: Record<DayPeriod, string> = {
  DAY: "낮",
  NIGHT: "야간",
};

export function getWaterStatusByLevel(waterLevel: number): WaterStatus {
  if (waterLevel >= 80) return "DANGER";
  if (waterLevel >= 60) return "WARNING";
  return "NORMAL";
}

export function getStatusTone(status: WaterStatus | DeviceStatus | AlertType): string {
  if (status === "NORMAL" || status === "ONLINE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "WARNING" || status === "MAINTENANCE" || status === "BATTERY_LOW") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-red-50 text-red-700 ring-red-200";
}
