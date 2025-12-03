import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Advenoh Status - System Monitoring Service';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 24,
            }}
          >
            <span style={{ fontSize: 48, color: 'white', fontWeight: 'bold' }}>
              A
            </span>
          </div>
          <span style={{ fontSize: 64, color: 'white', fontWeight: 'bold' }}>
            Advenoh Status
          </span>
        </div>
        <span style={{ fontSize: 32, color: '#94a3b8' }}>
          System Server Monitoring Service
        </span>
        <div
          style={{
            display: 'flex',
            marginTop: 60,
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              background: 'rgba(34, 197, 94, 0.2)',
              borderRadius: 12,
              border: '2px solid #22c55e',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#22c55e',
                marginRight: 8,
              }}
            />
            <span style={{ color: '#22c55e', fontSize: 20, fontWeight: 600 }}>
              Operational
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              background: 'rgba(234, 179, 8, 0.2)',
              borderRadius: 12,
              border: '2px solid #eab308',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#eab308',
                marginRight: 8,
              }}
            />
            <span style={{ color: '#eab308', fontSize: 20, fontWeight: 600 }}>
              Degraded
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: 12,
              border: '2px solid #ef4444',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#ef4444',
                marginRight: 8,
              }}
            />
            <span style={{ color: '#ef4444', fontSize: 20, fontWeight: 600 }}>
              Outage
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
