import { Link } from "react-router-dom";
import type { Device } from "../../types/device";
import { StatusBadge } from "../common/StatusBadge";

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  return (
    <Link to={`/devices/${device.id}`} className="block rounded-lg border border-slate-200 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-teal-400">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold tracking-normal text-slate-950">{device.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{device.location}</p>
        </div>
        <StatusBadge value={device.status} />
      </div>
      <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{device.description}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <p className="text-slate-500">배터리</p>
          <p className="mt-1 font-bold text-slate-950">{device.batteryLevel}%</p>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <p className="text-slate-500">촬영 주기</p>
          <p className="mt-1 font-bold text-slate-950">{device.recommendedInterval}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">최근 수위</span>
        <StatusBadge value={device.latestWaterStatus} />
      </div>
    </Link>
  );
}
