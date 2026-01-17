export type StatusType = 'OK' | 'WARN' | 'ERROR';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  url: string;
  threshold_ms: number;
  created_at: string;
}

export interface ServiceStatusLog {
  id: number;
  service_id: string;
  timestamp: string;
  status: StatusType;
  response_time: number;
  http_status: number | null;
  message: string | null;
}

// 서비스 정보가 포함된 상태 로그
export interface ServiceStatusLogWithService extends ServiceStatusLog {
  services: {
    name: string;
    url: string;
  } | null;
}

export interface ServiceWithStatus extends Service {
  currentStatus: StatusType;
  lastChecked: string | null;
}

// 일별 상태 요약
export interface DailyStatusSummary {
  id: string;
  service_id: string;
  date: string;
  status: StatusType;
  ok_count: number;
  warn_count: number;
  error_count: number;
  avg_response_time: number | null;
  updated_at: string;
  services?: {
    name: string;
    url: string;
  } | null;
}

// 서비스 생성 입력
export interface CreateServiceInput {
  name: string;
  url: string;
  threshold_ms?: number;
}

// 서비스 수정 입력
export interface UpdateServiceInput {
  name?: string;
  url?: string;
  threshold_ms?: number;
}

// Service Insert type
export type ServiceInsert = {
  name: string;
  url: string;
  threshold_ms?: number;
};

// Service Update type
export type ServiceUpdate = {
  name?: string;
  url?: string;
  threshold_ms?: number;
};
