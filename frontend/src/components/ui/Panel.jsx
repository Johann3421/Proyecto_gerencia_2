export default function Panel({ title, actions, children, noPad = false, className = '' }) {
  return (
    <div className={`panel ${className}`}>
      {title && (
        <div className="panel-header">
          <span className="panel-title">{title}</span>
          {actions && <div style={{ display: 'flex', gap: '6px' }}>{actions}</div>}
        </div>
      )}
      <div className={`panel-body ${noPad ? 'no-pad' : ''}`}>
        {children}
      </div>
    </div>
  );
}
