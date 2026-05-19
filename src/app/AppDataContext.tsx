import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type CompanyCreateInput, type DeviceCreateInput } from "../services/api";
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
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
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
      setInstitutions(companies);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCompanySnapshot = useCallback(async (institutionId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
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
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        try {
          const resolvedAlert = await api.resolveAlert(alertId);
          setAlerts((current) => current.map((alert) => (alert.id === alertId ? resolvedAlert : alert)));
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
        }
      },
      getWaterLevelGraph: async (deviceId) => {
        if (!selectedInstitution) return [];
        return api.getWaterLevelGraph(selectedInstitution.id, deviceId);
      },
      refreshSelectedInstitution: async () => {
        if (selectedInstitution) {
          await loadCompanySnapshot(selectedInstitution.id);
        } else {
          await loadCompanies();
        }
      },
    }),
    [alerts, devices, errorMessage, institutions, isLoading, loadCompanies, loadCompanySnapshot, selectedInstitution],
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
