import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type CompanyCreateInput, type DeviceCreateInput } from "../services/api";
import { alerts as mockAlerts } from "../mocks/alerts";
import { devices as mockDevices } from "../mocks/devices";
import { institutions as mockInstitutions } from "../mocks/institutions";
import { waterLevelHistory } from "../mocks/waterLevelHistory";
import type { Alert } from "../types/alert";
import type { AnalysisResult, WaterLevelPoint } from "../types/analysis";
import type { Device } from "../types/device";
import type { Institution } from "../types/institution";

interface AppDataContextValue {
  institutions: Institution[];
  selectedInstitution: Institution | null;
  devices: Device[];
  alerts: Alert[];
  isLoading: boolean;
  errorMessage: string | null;
  selectInstitution: (institutionId: string) => Promise<void>;
  clearInstitution: () => void;
  createInstitution: (input: CompanyCreateInput) => Promise<void>;
  addDevice: (input: DeviceCreateInput) => Promise<void>;
  uploadDeviceImage: (deviceId: string, file: File, batteryLevel?: number) => Promise<AnalysisResult>;
  resolveAlert: (alertId: string) => Promise<void>;
  getWaterLevelGraph: (deviceId: string) => Promise<WaterLevelPoint[]>;
  refreshSelectedInstitution: () => Promise<void>;
  applyAnalysisResult: (deviceId: string, result: AnalysisResult, imageUrl?: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

function formatNow() {
  return new Date().toLocaleString("ko-KR");
}

function buildWaterAlert(device: Device, result: AnalysisResult): Alert | null {
  if (result.status === "NORMAL") {
    return null;
  }

  return {
    id: `local-alert-${Date.now()}`,
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

function toLocalInstitution(input: CompanyCreateInput): Institution {
  return {
    id: `local-institution-${Date.now()}`,
    name: input.name,
    type: "기관",
    region: input.address || "주소 미등록",
    manager: input.managerName || "관리자 미등록",
    description: input.email ? `${input.email}${input.phone ? ` · ${input.phone}` : ""}` : "등록된 연락처 정보가 없습니다.",
    deviceCount: 0,
    riskLevel: "NORMAL",
  };
}

function toLocalDevice(input: DeviceCreateInput, institutionId: string): Device {
  const deviceId = `local-device-${Date.now()}`;

  return {
    id: deviceId,
    institutionId,
    name: input.name,
    location: input.locationName,
    description: `시리얼 번호: ${input.serialNumber}`,
    status: "ONLINE",
    batteryLevel: input.batteryLevel ?? 100,
    latestWaterStatus: "NORMAL",
    recommendedInterval: "30분",
    latestImageUrl: "/images/channel-north.svg",
    latestAnalysis: {
      id: `local-analysis-${Date.now()}`,
      deviceId,
      waterLevel: 0,
      status: "NORMAL",
      riskScore: 0,
      confidence: 0,
      reason: "아직 업로드된 이미지 분석 결과가 없습니다.",
      recommendedAction: "이미지 분석 화면에서 수로 이미지를 업로드하세요.",
      capturedAt: "분석 전",
    },
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === selectedInstitutionId) ?? null,
    [institutions, selectedInstitutionId],
  );

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const companies = await api.getCompanies();
      setIsBackendAvailable(true);
      setInstitutions(companies);
    } catch (error) {
      console.warn("Backend API is unavailable. Falling back to local demo data.", error);
      setIsBackendAvailable(false);
      setInstitutions(mockInstitutions);
      setErrorMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCompanySnapshot = useCallback(async (institutionId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    if (!isBackendAvailable) {
      setDevices(mockDevices.filter((device) => device.institutionId === institutionId));
      setAlerts(mockAlerts.filter((alert) => mockDevices.some((device) => device.institutionId === institutionId && device.id === alert.deviceId)));
      setIsLoading(false);
      return;
    }

    try {
      const snapshot = await api.getCompanySnapshot(institutionId);
      setDevices(snapshot.devices);
      setAlerts(snapshot.alerts);
      setInstitutions((current) =>
        current.map((institution) =>
          institution.id === institutionId
            ? {
                ...institution,
                deviceCount: snapshot.dashboard?.deviceCount ?? snapshot.devices.length,
                riskLevel: snapshot.dashboard?.latestWaterLevelStatus ?? "NORMAL",
              }
            : institution,
        ),
      );
    } catch (error) {
      console.warn("Backend snapshot API is unavailable. Falling back to local demo data.", error);
      setIsBackendAvailable(false);
      setDevices(mockDevices.filter((device) => device.institutionId === institutionId));
      setAlerts(mockAlerts.filter((alert) => mockDevices.some((device) => device.institutionId === institutionId && device.id === alert.deviceId)));
      setErrorMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, [isBackendAvailable]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      institutions,
      selectedInstitution,
      devices,
      alerts,
      isLoading,
      errorMessage,
      selectInstitution: async (institutionId) => {
        setSelectedInstitutionId(institutionId);
        await loadCompanySnapshot(institutionId);
      },
      clearInstitution: () => {
        setSelectedInstitutionId(null);
        setDevices([]);
        setAlerts([]);
      },
      createInstitution: async (input) => {
        if (!isBackendAvailable) {
          const institution = toLocalInstitution(input);
          setInstitutions((current) => [institution, ...current]);
          return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        try {
          const institution = await api.createCompany(input);
          setInstitutions((current) => [institution, ...current]);
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
          throw error;
        } finally {
          setIsLoading(false);
        }
      },
      addDevice: async (input) => {
        if (!selectedInstitution) return;
        if (!isBackendAvailable) {
          const device = toLocalDevice(input, selectedInstitution.id);
          setDevices((current) => [device, ...current]);
          setInstitutions((current) =>
            current.map((institution) =>
              institution.id === selectedInstitution.id
                ? { ...institution, deviceCount: institution.deviceCount + 1 }
                : institution,
            ),
          );
          return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        try {
          await api.createDevice(selectedInstitution.id, input);
          await loadCompanySnapshot(selectedInstitution.id);
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
          throw error;
        } finally {
          setIsLoading(false);
        }
      },
      uploadDeviceImage: async (deviceId, file, batteryLevel) => {
        if (!selectedInstitution) {
          throw new Error("기관을 먼저 선택해주세요.");
        }
        if (!isBackendAvailable) {
          throw new Error("백엔드 미연결 모드에서는 이미지 저장 API를 사용할 수 없습니다. AI 분석 화면을 사용해주세요.");
        }

        setIsLoading(true);
        setErrorMessage(null);
        try {
          const result = await api.uploadImage(selectedInstitution.id, deviceId, file, batteryLevel);
          await loadCompanySnapshot(selectedInstitution.id);
          return result;
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
          throw error;
        } finally {
          setIsLoading(false);
        }
      },
      resolveAlert: async (alertId) => {
        setErrorMessage(null);
        if (!isBackendAvailable || alertId.startsWith("local-alert-")) {
          setAlerts((current) => current.map((alert) => (alert.id === alertId ? { ...alert, isResolved: true } : alert)));
          return;
        }
        try {
          const resolvedAlert = await api.resolveAlert(alertId);
          setAlerts((current) => current.map((alert) => (alert.id === alertId ? resolvedAlert : alert)));
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
        }
      },
      getWaterLevelGraph: async (deviceId) => {
        if (!selectedInstitution) return [];
        if (!isBackendAvailable) {
          return waterLevelHistory[deviceId] ?? [];
        }
        return api.getWaterLevelGraph(selectedInstitution.id, deviceId);
      },
      refreshSelectedInstitution: async () => {
        if (selectedInstitution) {
          await loadCompanySnapshot(selectedInstitution.id);
        } else {
          await loadCompanies();
        }
      },
      applyAnalysisResult: (deviceId, result, imageUrl) => {
        let updatedDevice: Device | undefined;

        setDevices((current) =>
          current.map((device) => {
            if (device.id !== deviceId) {
              return device;
            }

            updatedDevice = {
              ...device,
              latestWaterStatus: result.status,
              recommendedInterval: result.recommendedInterval ? `${result.recommendedInterval}분` : device.recommendedInterval,
              latestImageUrl: imageUrl ?? device.latestImageUrl,
              latestAnalysis: result,
            };

            return updatedDevice;
          }),
        );

        if (updatedDevice) {
          setInstitutions((current) =>
            current.map((institution) =>
              institution.id === updatedDevice?.institutionId ? { ...institution, riskLevel: result.status } : institution,
            ),
          );

          const alert = buildWaterAlert(updatedDevice, result);
          if (alert) {
            setAlerts((current) => [alert, ...current]);
          }
        }
      },
    }),
    [alerts, devices, errorMessage, institutions, isBackendAvailable, isLoading, loadCompanies, loadCompanySnapshot, selectedInstitution],
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
