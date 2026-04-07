export default function Button({ children, variant = 'default', size, icon, className = '', ...props }) {
  const cls = [
    'btn',
    variant === 'primary' && 'btn-primary',
    variant === 'danger' && 'btn-danger',
    size === 'sm' && 'btn-sm',
    icon && !children && 'btn-icon',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} {...props}>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
}
