export interface Institution {
  id: string;
  name: string;
  type: string;
  region: string;
  manager: string;
  description: string;
  deviceCount: number;
  riskLevel: "NORMAL" | "WARNING" | "DANGER";
}
