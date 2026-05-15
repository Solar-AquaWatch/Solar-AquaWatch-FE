import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { alerts as initialAlerts } from "../mocks/alerts";
import { devices as initialDevices } from "../mocks/devices";
import type { Alert } from "../types/alert";
import type { Device } from "../types/device";
import { getWaterStatusByLevel } from "../utils/status";

interface DeviceInput {
  name: string;
  location: string;
  description: string;
}

interface AppDataContextValue {
  devices: Device[];
  alerts: Alert[];
  addDevice: (input: DeviceInput) => void;
  resolveAlert: (alertId: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  const value = useMemo<AppDataContextValue>(
    () => ({
      devices,
      alerts,
      addDevice: (input) => {
        const waterLevel = 38;
        const newDevice: Device = {
          id: `device-${Date.now()}`,
          name: input.name,
          location: input.location,
          description: input.description,
          status: "ONLINE",
          batteryLevel: 78,
          latestWaterStatus: getWaterStatusByLevel(waterLevel),
          recommendedInterval: "15분",
          latestImageUrl: "/images/channel-north.svg",
          latestAnalysis: {
            id: `analysis-${Date.now()}`,
            deviceId: `device-${Date.now()}`,
            waterLevel,
            status: getWaterStatusByLevel(waterLevel),
            riskScore: 24,
            confidence: 0.86,
            reason: "신규 등록 장치의 초기 기준 이미지가 정상 범위로 분류되었습니다.",
            recommendedAction: "초기 운영 데이터가 쌓일 때까지 15분 주기로 촬영하세요.",
            capturedAt: "2026-05-15 11:00",
          },
        };
        newDevice.latestAnalysis.deviceId = newDevice.id;
        setDevices((current) => [newDevice, ...current]);
      },
      resolveAlert: (alertId) => {
        setAlerts((current) =>
          current.map((alert) => (alert.id === alertId ? { ...alert, isResolved: true } : alert)),
        );
      },
    }),
    [alerts, devices],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}
