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

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      services: {
        Row: Service;
        Insert: Omit<Service, 'id' | 'created_at'>;
        Update: Partial<Omit<Service, 'id' | 'created_at'>>;
      };
      service_status_logs: {
        Row: ServiceStatusLog;
        Insert: Omit<ServiceStatusLog, 'id' | 'timestamp'>;
        Update: Partial<Omit<ServiceStatusLog, 'id' | 'timestamp'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
