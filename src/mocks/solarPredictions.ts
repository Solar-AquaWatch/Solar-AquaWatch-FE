import type { SolarPrediction } from "../types/solar";

export const solarPredictions: SolarPrediction[] = [
  {
    id: "solar-001",
    deviceId: "device-001",
    weather: "SUNNY",
    period: "DAY",
    generationForecast: "HIGH",
    batteryLevel: 86,
    waterStatus: "NORMAL",
  },
  {
    id: "solar-002",
    deviceId: "device-002",
    weather: "CLOUDY",
    period: "DAY",
    generationForecast: "MEDIUM",
    batteryLevel: 58,
    waterStatus: "WARNING",
  },
  {
    id: "solar-003",
    deviceId: "device-003",
    weather: "RAINY",
    period: "DAY",
    generationForecast: "LOW",
    batteryLevel: 64,
    waterStatus: "DANGER",
  },
  {
    id: "solar-004",
    deviceId: "device-004",
    weather: "RAINY",
    period: "NIGHT",
    generationForecast: "LOW",
    batteryLevel: 18,
    waterStatus: "NORMAL",
  },
];
