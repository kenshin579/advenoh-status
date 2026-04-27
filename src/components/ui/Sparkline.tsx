interface SparklineProps {
  values: number[];
  color: string;
  height?: number;
  ariaLabel?: string;
}

export default function Sparkline({
  values,
  color,
  height = 28,
  ariaLabel = '응답 시간 추이',
}: SparklineProps) {
  if (values.length === 0) {
    return <div style={{ height }} aria-hidden />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const gradId = `sparkfill-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width="100%"
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,100 ${points} 100,100`} fill={`url(#${gradId})`} stroke="none" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
