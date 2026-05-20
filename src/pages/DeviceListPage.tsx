import { useState } from "react";
import { useAppData } from "../app/AppDataContext";
import { EmptyState } from "../components/common/EmptyState";
import { SectionTitle } from "../components/common/SectionTitle";
import { DeviceCard } from "../components/devices/DeviceCard";
import { DeviceRegisterModal } from "../components/devices/DeviceRegisterModal";

export function DeviceListPage() {
  const { devices, addDevice, isLoading, errorMessage } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle title="수로 카메라 장치" description="장치를 등록하거나 선택해 상세 수위 분석 상태를 확인합니다." />
        <button type="button" onClick={() => setIsModalOpen(true)} className="primary-button">
          장치 등록
        </button>
      </div>
      {errorMessage ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errorMessage}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
        {!isLoading && !devices.length ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="등록된 장치가 없습니다" description="장치 등록 버튼으로 백엔드에 새 수로 카메라를 등록해주세요." />
          </div>
        ) : null}
      </div>
      <DeviceRegisterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={addDevice} />
    </div>
  );
}
