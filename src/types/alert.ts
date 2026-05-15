import type { WaterStatus } from "./analysis";

export type AlertType = "WATER_RISK" | "BATTERY_LOW" | "DEVICE_OFFLINE";

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  deviceId: string;
  deviceName: string;
  waterStatus: WaterStatus;
  isResolved: boolean;
  createdAt: string;
}
