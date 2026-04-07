export default function Modal({ title, onClose, children, width = '500px' }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      backdropFilter: 'blur(2px)', padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)', padding: '24px',
        borderRadius: '8px', width: '100%', maxWidth: width,
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        border: '1px solid var(--border-color)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ 
            background: 'none', border: 'none', cursor: 'pointer', 
            fontSize: '24px', color: 'var(--text-tertiary)', lineHeight: 1 
          }}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
