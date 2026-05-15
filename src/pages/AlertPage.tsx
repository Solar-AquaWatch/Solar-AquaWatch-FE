import { useAppData } from "../app/AppDataContext";
import { AlertItem } from "../components/alerts/AlertItem";
import { SectionTitle } from "../components/common/SectionTitle";

export function AlertPage() {
  const { alerts, resolveAlert } = useAppData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle title="위험 알림 처리" description="현장 점검 이후 알림을 처리 완료 상태로 변경합니다." />
        <p className="text-sm font-bold text-slate-500">미처리 {alerts.filter((alert) => !alert.isResolved).length}건</p>
      </div>
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onResolve={resolveAlert} />
        ))}
      </div>
    </div>
  );
}
