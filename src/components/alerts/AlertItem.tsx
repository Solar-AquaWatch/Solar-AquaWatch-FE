import type { Alert } from "../../types/alert";
import { alertTypeLabel } from "../../utils/status";
import { StatusBadge } from "../common/StatusBadge";

interface AlertItemProps {
  alert: Alert;
  onResolve: (alertId: string) => void;
}

export function AlertItem({ alert, onResolve }: AlertItemProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={alert.type} />
            <StatusBadge value={alert.waterStatus} />
            <StatusBadge value={alert.isResolved ? "RESOLVED" : "OPEN"} />
          </div>
          <h3 className="mt-3 text-lg font-bold tracking-normal text-ink">{alert.message}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {alertTypeLabel[alert.type]} · {alert.deviceName} · {alert.createdAt}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onResolve(alert.id)}
          disabled={alert.isResolved}
          className="rounded-md bg-ink px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          처리 완료
        </button>
      </div>
    </div>
  );
}
