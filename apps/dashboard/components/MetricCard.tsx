interface MetricCardProps {
  label: string;
  value: number | string;
  icon?: string;
  sub?: string;
  accent?: boolean;
}

export default function MetricCard({ label, value, icon, sub, accent }: MetricCardProps) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div className="label">{label}</div>
        {icon && <span style={{ fontSize: '18px', opacity: 0.6 }}>{icon}</span>}
      </div>
      <div className="mono" style={{
        fontSize: '30px', fontWeight: 700, lineHeight: 1, letterSpacing: '-1px',
        color: accent ? '#BFFF00' : '#EEEEF8',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: '#404060', marginTop: '8px' }}>{sub}</div>
      )}
    </div>
  );
}
