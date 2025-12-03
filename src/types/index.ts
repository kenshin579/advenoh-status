export type StatusType = 'OK' | 'WARN' | 'ERROR';

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
    };
  };
}
