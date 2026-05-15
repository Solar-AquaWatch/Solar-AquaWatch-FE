import type { Institution } from "../types/institution";

export const institutions: Institution[] = [
  {
    id: "institution-suss",
    name: "SUSS Campus Facility",
    type: "교육기관",
    region: "Singapore Clementi",
    manager: "Campus Ops Team",
    description: "캠퍼스 배수로와 저지대 월류 구간을 통합 관리합니다.",
    deviceCount: 3,
    riskLevel: "DANGER",
  },
  {
    id: "institution-farm",
    name: "Bukit Timah Smart Farm",
    type: "농업 법인",
    region: "Bukit Timah",
    manager: "Farm Control Center",
    description: "태양광 기반 농수로 카메라를 중심으로 물 공급 상태를 감시합니다.",
    deviceCount: 1,
    riskLevel: "NORMAL",
  },
  {
    id: "institution-town",
    name: "Jurong Town Council",
    type: "공공 관리 주체",
    region: "Jurong West",
    manager: "Drainage Response Unit",
    description: "주거지 인근 합류 수로와 우천 시 역류 위험 구간을 관리합니다.",
    deviceCount: 1,
    riskLevel: "WARNING",
  },
];
