import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { alerts as initialAlerts } from "../mocks/alerts";
import { devices as initialDevices } from "../mocks/devices";
import { institutions } from "../mocks/institutions";
import type { Alert } from "../types/alert";
import type { AnalysisResult } from "../types/analysis";
import type { Device } from "../types/device";
import type { Institution } from "../types/institution";
import { getWaterStatusByLevel } from "../utils/status";

interface DeviceInput {
  name: string;
  location: string;
  description: string;
}

interface AppDataContextValue {
  institutions: Institution[];
  selectedInstitution: Institution | null;
  devices: Device[];
  alerts: Alert[];
  selectInstitution: (institutionId: string) => void;
  clearInstitution: () => void;
  addDevice: (input: DeviceInput) => void;
  resolveAlert: (alertId: string) => void;
  applyAnalysisResult: (deviceId: string, result: AnalysisResult, imageUrl?: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function formatNow() {
  return new Date().toLocaleString("ko-KR");
}

function buildWaterAlert(device: Device, result: AnalysisResult): Alert | null {
  if (result.status === "NORMAL") {
    return null;
  }

  return {
    id: `alert-${Date.now()}`,
    type: "WATER_RISK",
    message:
      result.status === "DANGER"
        ? `${device.name} 수위가 위험 단계입니다. 즉시 현장 점검이 필요합니다.`
        : `${device.name} 수위가 주의 단계로 상승했습니다. 추이 확인이 필요합니다.`,
    deviceId: device.id,
    deviceName: device.name,
    waterStatus: result.status,
    isResolved: false,
    createdAt: formatNow(),
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === selectedInstitutionId) ?? null,
    [selectedInstitutionId],
  );

  const institutionDevices = useMemo(
    () =>
      selectedInstitution
        ? devices.filter((device) => device.institutionId === selectedInstitution.id)
        : [],
    [devices, selectedInstitution],
  );

  const institutionAlerts = useMemo(() => {
    if (!selectedInstitution) {
      return [];
    }

    const institutionDeviceIds = new Set(institutionDevices.map((device) => device.id));
    return alerts.filter((alert) => institutionDeviceIds.has(alert.deviceId));
  }, [alerts, institutionDevices, selectedInstitution]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      institutions,
      selectedInstitution,
      devices: institutionDevices,
      alerts: institutionAlerts,

      selectInstitution: setSelectedInstitutionId,

      clearInstitution: () => setSelectedInstitutionId(null),

      addDevice: (input) => {
        if (!selectedInstitution) {
          return;
        }

        const waterLevel = 38;
        const newDeviceId = `device-${Date.now()}`;

        const initialAnalysis: AnalysisResult = {
          id: `analysis-${Date.now()}`,
          deviceId: newDeviceId,
          waterLevel,
          status: getWaterStatusByLevel(waterLevel),
          riskScore: 24,
          confidence: 0.86,
          reason: "신규 등록 장치의 초기 기준 이미지가 정상 범위로 분류되었습니다.",
          recommendedAction: "초기 운영 데이터가 쌓일 때까지 15분 주기로 촬영하세요.",
          capturedAt: "2026-05-15 11:00",
          solarPrediction: "MEDIUM",
          recommendedInterval: 15,
          dataSources: ["초기 등록 데이터"],
        };

        const newDevice: Device = {
          id: newDeviceId,
          institutionId: selectedInstitution.id,
          name: input.name,
          location: input.location,
          description: input.description,
          status: "ONLINE",
          batteryLevel: 78,
          latestWaterStatus: initialAnalysis.status,
          recommendedInterval: "15분",
          latestImageUrl: "/images/channel-north.svg",
          latestAnalysis: initialAnalysis,
        };

        setDevices((current) => [newDevice, ...current]);
      },

      resolveAlert: (alertId) => {
        setAlerts((current) =>
          current.map((alert) => (alert.id === alertId ? { ...alert, isResolved: true } : alert)),
        );
      },

      applyAnalysisResult: (deviceId, result, imageUrl) => {
        let targetDevice: Device | undefined;

        setDevices((current) =>
          current.map((device) => {
            if (device.id !== deviceId) {
              return device;
            }

            targetDevice = device;

            return {
              ...device,
              latestWaterStatus: result.status,
              recommendedInterval: result.recommendedInterval
                ? `${result.recommendedInterval}분`
                : device.recommendedInterval,
              latestImageUrl: imageUrl ?? device.latestImageUrl,
              latestAnalysis: result,
            };
          }),
        );

        if (targetDevice) {
          const alert = buildWaterAlert(targetDevice, result);

          if (alert) {
            setAlerts((current) => [alert, ...current]);
          }
        }
      },
    }),
    [institutionAlerts, institutionDevices, selectedInstitution],
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
