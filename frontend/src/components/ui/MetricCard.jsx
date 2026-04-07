export default function MetricCard({ label, value, change, positive }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {change !== undefined && (
        <div className={`metric-change ${positive ? 'positive' : 'negative'}`}>
          {positive ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
  );
}
