import type { SolarPrediction, SolarRecommendation } from "../types/solar";

export function getSolarRecommendation(input: SolarPrediction): SolarRecommendation {
  if (input.waterStatus === "DANGER") {
    return {
      generationForecast: input.generationForecast,
      recommendedInterval: "5분",
      operationMode: "위험 대응 모드",
      powerSaving: false,
    };
  }

  if (input.batteryLevel < 20) {
    return {
      generationForecast: "LOW",
      recommendedInterval: "60분",
      operationMode: "초절전 모드",
      powerSaving: true,
    };
  }

  if (input.weather === "SUNNY" && input.period === "DAY" && input.batteryLevel >= 60) {
    return {
      generationForecast: "HIGH",
      recommendedInterval: "5분",
      operationMode: "집중 모니터링",
      powerSaving: false,
    };
  }

  if ((input.weather === "CLOUDY" || input.generationForecast === "MEDIUM") && input.batteryLevel >= 30) {
    return {
      generationForecast: "MEDIUM",
      recommendedInterval: "15분",
      operationMode: "일반 모니터링",
      powerSaving: false,
    };
  }

  return {
    generationForecast: "LOW",
    recommendedInterval: input.batteryLevel < 30 ? "60분" : "30분",
    operationMode: "절전 모니터링",
    powerSaving: true,
  };
}
