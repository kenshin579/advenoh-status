import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPERBASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPERBASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type StatusType = 'OK' | 'WARN' | 'ERROR';

interface Service {
  id: string;
  name: string;
}

function getRandomStatus(okProbability: number, warnProbability: number): StatusType {
  const rand = Math.random();
  if (rand < okProbability) return 'OK';
  if (rand < okProbability + warnProbability) return 'WARN';
  return 'ERROR';
}

function getRandomResponseTime(status: StatusType, baseTime: number): number {
  if (status === 'ERROR') return 0;
  if (status === 'WARN') return 3100 + Math.floor(Math.random() * 1500);
  return baseTime + Math.floor(Math.random() * 500);
}

async function seedTestData() {
  console.log('Starting seed process...');
  console.log('Using Supabase URL:', SUPABASE_URL);

  // 1. 기존 로그 삭제
  console.log('Deleting existing logs...');
  const { error: deleteError } = await supabase
    .from('service_status_logs')
    .delete()
    .neq('id', 0); // 모든 레코드 삭제

  if (deleteError) {
    console.error('Error deleting logs:', deleteError);
    return;
  }

  // 2. 서비스 목록 조회
  console.log('Fetching services...');
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name');

  if (servicesError || !services) {
    console.error('Error fetching services:', servicesError);
    return;
  }

  console.log('Found services:', services.map(s => s.name).join(', '));

  // 3. 각 서비스별 설정
  const serviceConfig: Record<string, { okProb: number; warnProb: number; baseTime: number }> = {
    'Inspire Me': { okProb: 0.90, warnProb: 0.07, baseTime: 100 },
    'ArgoCD': { okProb: 0.95, warnProb: 0.03, baseTime: 150 },
    'Redis Insight': { okProb: 0.85, warnProb: 0.10, baseTime: 80 },
  };

  // 4. 90일간의 테스트 데이터 생성
  const logs: Array<{
    service_id: string;
    timestamp: string;
    status: StatusType;
    response_time: number;
    http_status: number;
    message: string | null;
  }> = [];

  const now = new Date();

  for (const service of services as Service[]) {
    const config = serviceConfig[service.name] || { okProb: 0.9, warnProb: 0.05, baseTime: 100 };

    for (let i = 0; i < 90; i++) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - i);
      timestamp.setHours(12, 0, 0, 0); // 정오로 설정

      const status = getRandomStatus(config.okProb, config.warnProb);
      const responseTime = getRandomResponseTime(status, config.baseTime);

      logs.push({
        service_id: service.id,
        timestamp: timestamp.toISOString(),
        status,
        response_time: responseTime,
        http_status: status === 'ERROR' ? 500 : 200,
        message: status === 'ERROR' ? 'Connection timeout' : null,
      });
    }
  }

  // 5. 데이터 삽입 (배치로)
  console.log(`Inserting ${logs.length} log entries...`);

  const batchSize = 100;
  for (let i = 0; i < logs.length; i += batchSize) {
    const batch = logs.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('service_status_logs')
      .insert(batch);

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      return;
    }
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(logs.length / batchSize)}`);
  }

  // 6. 결과 확인
  console.log('\nVerifying data...');
  const { data: counts, error: countError } = await supabase
    .from('service_status_logs')
    .select('status')
    .then(res => {
      if (res.error) return res;
      const statusCounts = { OK: 0, WARN: 0, ERROR: 0 };
      res.data?.forEach(log => {
        statusCounts[log.status as StatusType]++;
      });
      return { data: statusCounts, error: null };
    });

  if (countError) {
    console.error('Error verifying:', countError);
  } else {
    console.log('Status counts:', counts);
  }

  console.log('\nSeed completed successfully!');
}

seedTestData().catch(console.error);
