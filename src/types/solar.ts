import type { WaterStatus } from "./analysis";

export type WeatherStatus = "SUNNY" | "CLOUDY" | "RAINY";
export type DayPeriod = "DAY" | "NIGHT";
export type GenerationForecast = "HIGH" | "MEDIUM" | "LOW";

export interface SolarPrediction {
  id: string;
  deviceId: string;
  weather: WeatherStatus;
  period: DayPeriod;
  generationForecast: GenerationForecast;
  batteryLevel: number;
  waterStatus: WaterStatus;
}

export interface SolarRecommendation {
  generationForecast: GenerationForecast;
  recommendedInterval: string;
  operationMode: string;
  powerSaving: boolean;
}
