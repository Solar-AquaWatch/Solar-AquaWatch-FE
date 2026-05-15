import type { AlertType } from "../../types/alert";
import type { DeviceStatus } from "../../types/device";
import type { WaterStatus } from "../../types/analysis";
import { alertTypeLabel, deviceStatusLabel, getStatusTone, waterStatusLabel } from "../../utils/status";

interface StatusBadgeProps {
  value: WaterStatus | DeviceStatus | AlertType | "RESOLVED" | "OPEN";
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const label =
    value === "RESOLVED"
      ? "처리 완료"
      : value === "OPEN"
        ? "미처리"
        : value in waterStatusLabel
          ? waterStatusLabel[value as WaterStatus]
          : value in deviceStatusLabel
            ? deviceStatusLabel[value as DeviceStatus]
            : alertTypeLabel[value as AlertType];

  const tone =
    value === "RESOLVED"
      ? "bg-slate-100 text-slate-600 ring-slate-200"
      : value === "OPEN"
        ? "bg-red-50 text-red-700 ring-red-200"
        : getStatusTone(value as WaterStatus | DeviceStatus | AlertType);

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>{label}</span>;
}
