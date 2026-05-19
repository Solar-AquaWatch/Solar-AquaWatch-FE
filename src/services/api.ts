import type { Alert } from "../types/alert";
import type { AnalysisResult, WaterLevelPoint, WaterStatus } from "../types/analysis";
import type { Device, DeviceStatus } from "../types/device";
import type { Institution } from "../types/institution";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

export interface CompanyCreateInput {
  name: string;
  managerName: string;
  phone: string;
  email: string;
  address: string;
}

export interface DeviceCreateInput {
  name: string;
  serialNumber: string;
  locationName: string;
  latitude?: string;
  longitude?: string;
  batteryLevel?: number;
}

interface CompanyResponse {
  id: number;
  name: string;
  managerName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeviceResponse {
  id: number;
  companyId: number;
  name: string;
  serialNumber: string;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  batteryLevel: number;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RecentAnalysisItem {
  analysisResultId: number;
  deviceId: number;
  deviceName: string;
  waterLevelStatus: WaterStatus;
  riskScore: number;
  waterLevelRatio: number;
  analyzedAt: string;
}

interface DashboardResponse {
  companyId: number;
  companyName: string;
  deviceCount: number;
  normalCount: number;
  warningCount: number;
  dangerCount: number;
  latestWaterLevelStatus: WaterStatus | null;
  latestRiskScore: number | null;
  latestAnalyzedAt: string | null;
  recentAnalyses: RecentAnalysisItem[];
}

interface AlertResponse {
  id: number;
  deviceId: number;
  deviceName: string;
  severity: WaterStatus;
  message: string;
  status: "UNREAD" | "READ" | "RESOLVED";
  createdAt: string;
}

interface ImageAnalysisResponse {
  imageId: number;
  analysisResultId: number;
  filePath: string;
  waterLevelStatus: WaterStatus;
  riskScore: number;
  waterLevelRatio: number;
  batteryLevel: number;
  captureIntervalRecommendation: "FIVE_MINUTES" | "TEN_MINUTES" | "THIRTY_MINUTES" | "SIXTY_MINUTES";
  analyzedAt: string;
}

interface WaterLevelGraphPointResponse {
  analyzedAt: string;
  waterLevelStatus: WaterStatus;
  riskScore: number;
  waterLevelRatio: number;
}

export interface CompanySnapshot {
  devices: Device[];
  alerts: Alert[];
  dashboard: DashboardResponse | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `요청에 실패했습니다. (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "분석 전";
  return value.replace("T", " ").slice(0, 16);
}

function mapDeviceStatus(status: DeviceResponse["status"]): DeviceStatus {
  if (status === "MAINTENANCE") return "MAINTENANCE";
  if (status === "INACTIVE") return "OFFLINE";
  return "ONLINE";
}

function intervalLabel(value?: ImageAnalysisResponse["captureIntervalRecommendation"]) {
  if (value === "FIVE_MINUTES") return "5분";
  if (value === "TEN_MINUTES") return "10분";
  if (value === "SIXTY_MINUTES") return "60분";
  return "30분";
}

function defaultAnalysis(deviceId: string): AnalysisResult {
  return {
    id: `empty-${deviceId}`,
    deviceId,
    waterLevel: 0,
    status: "NORMAL",
    riskScore: 0,
    confidence: 0,
    reason: "아직 업로드된 이미지 분석 결과가 없습니다.",
    recommendedAction: "테스트 이미지 업로드 화면에서 이미지를 분석하면 최신 결과가 반영됩니다.",
    capturedAt: "분석 전",
  };
}

function mapRecentAnalysis(item: RecentAnalysisItem): AnalysisResult {
  return {
    id: String(item.analysisResultId),
    deviceId: String(item.deviceId),
    waterLevel: Math.round(item.waterLevelRatio * 100),
    status: item.waterLevelStatus,
    riskScore: item.riskScore,
    confidence: 0.9,
    reason: `${item.deviceName} 장치의 최근 수위 상태는 ${item.waterLevelStatus}입니다.`,
    recommendedAction: item.waterLevelStatus === "DANGER" ? "현장 점검을 진행하고 촬영 주기를 단축하세요." : "현재 운영 상태를 유지하세요.",
    capturedAt: formatDateTime(item.analyzedAt),
  };
}

function mapDevice(device: DeviceResponse, latest?: RecentAnalysisItem): Device {
  const analysis = latest ? mapRecentAnalysis(latest) : defaultAnalysis(String(device.id));

  return {
    id: String(device.id),
    institutionId: String(device.companyId),
    name: device.name,
    location: device.locationName ?? "위치 미등록",
    description: `시리얼 번호: ${device.serialNumber}`,
    status: mapDeviceStatus(device.status),
    batteryLevel: device.batteryLevel,
    latestWaterStatus: analysis.status,
    recommendedInterval: analysis.status === "DANGER" ? "5분" : analysis.status === "WARNING" ? "10분" : "30분",
    latestImageUrl: "/images/channel-north.svg",
    latestAnalysis: analysis,
  };
}

function mapCompany(company: CompanyResponse): Institution {
  return {
    id: String(company.id),
    name: company.name,
    type: "기관",
    region: company.address ?? "주소 미등록",
    manager: company.managerName ?? "관리자 미등록",
    description: company.email ? `${company.email}${company.phone ? ` · ${company.phone}` : ""}` : "등록된 연락처 정보가 없습니다.",
    deviceCount: 0,
    riskLevel: "NORMAL",
  };
}

function mapAlert(alert: AlertResponse): Alert {
  return {
    id: String(alert.id),
    type: "WATER_RISK",
    message: alert.message,
    deviceId: String(alert.deviceId),
    deviceName: alert.deviceName,
    waterStatus: alert.severity,
    isResolved: alert.status === "RESOLVED",
    createdAt: formatDateTime(alert.createdAt),
  };
}

export function mapImageAnalysis(deviceId: string, response: ImageAnalysisResponse): AnalysisResult {
  return {
    id: String(response.analysisResultId),
    deviceId,
    waterLevel: Math.round(response.waterLevelRatio * 100),
    status: response.waterLevelStatus,
    riskScore: response.riskScore,
    confidence: 0.9,
    reason: `백엔드 더미 분석 결과 수위 상태가 ${response.waterLevelStatus}로 분류되었습니다.`,
    recommendedAction: `추천 촬영 주기: ${intervalLabel(response.captureIntervalRecommendation)}`,
    capturedAt: formatDateTime(response.analyzedAt),
  };
}

export const api = {
  async getCompanies() {
    const companies = await request<CompanyResponse[]>("/companies");
    return companies.map(mapCompany);
  },

  async createCompany(input: CompanyCreateInput) {
    const company = await request<CompanyResponse>("/companies", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return mapCompany(company);
  },

  async getCompanySnapshot(companyId: string): Promise<CompanySnapshot> {
    const [devices, alerts, dashboard] = await Promise.all([
      request<DeviceResponse[]>(`/companies/${companyId}/devices`),
      request<AlertResponse[]>(`/companies/${companyId}/alerts`),
      request<DashboardResponse>(`/companies/${companyId}/dashboard`),
    ]);
    const latestByDevice = new Map(dashboard.recentAnalyses.map((item) => [String(item.deviceId), item]));

    return {
      devices: devices.map((device) => mapDevice(device, latestByDevice.get(String(device.id)))),
      alerts: alerts.map(mapAlert),
      dashboard,
    };
  },

  async createDevice(companyId: string, input: DeviceCreateInput) {
    await request<DeviceResponse>(`/companies/${companyId}/devices`, {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        serialNumber: input.serialNumber,
        locationName: input.locationName,
        latitude: input.latitude ? Number(input.latitude) : null,
        longitude: input.longitude ? Number(input.longitude) : null,
        status: "ACTIVE",
        batteryLevel: input.batteryLevel ?? 100,
      }),
    });
  },

  async uploadImage(companyId: string, deviceId: string, file: File, batteryLevel?: number) {
    const formData = new FormData();
    formData.append("file", file);
    if (batteryLevel !== undefined) {
      formData.append("batteryLevel", String(batteryLevel));
    }
    const response = await request<ImageAnalysisResponse>(`/companies/${companyId}/devices/${deviceId}/images`, {
      method: "POST",
      body: formData,
    });
    return mapImageAnalysis(deviceId, response);
  },

  async resolveAlert(alertId: string) {
    const alert = await request<AlertResponse>(`/alerts/${alertId}/resolve`, { method: "PATCH" });
    return mapAlert(alert);
  },

  async getWaterLevelGraph(companyId: string, deviceId: string): Promise<WaterLevelPoint[]> {
    const points = await request<WaterLevelGraphPointResponse[]>(`/companies/${companyId}/devices/${deviceId}/water-levels`);
    return points.map((point) => ({
      time: formatDateTime(point.analyzedAt).slice(5),
      waterLevel: Math.round(point.waterLevelRatio * 100),
      riskScore: point.riskScore,
    }));
  },
};
