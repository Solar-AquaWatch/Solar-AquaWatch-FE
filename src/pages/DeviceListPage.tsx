import { useState } from "react";
import { useAppData } from "../app/AppDataContext";
import { SectionTitle } from "../components/common/SectionTitle";
import { DeviceCard } from "../components/devices/DeviceCard";
import { DeviceRegisterModal } from "../components/devices/DeviceRegisterModal";

export function DeviceListPage() {
  const { devices, addDevice } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle title="수로 카메라 장치" description="장치를 등록하거나 선택해 상세 수위 분석 상태를 확인합니다." />
        <button type="button" onClick={() => setIsModalOpen(true)} className="rounded-md bg-aqua px-4 py-3 text-sm font-bold text-white">
          장치 등록
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
      <DeviceRegisterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={addDevice} />
    </div>
  );
}
