import { useEffect } from 'react';

const icons = {
  Home: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  'Delivery Orders': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 7h15v12.5H4.5zm3-3h9l1.5 3H6zM8 12.2h8M8 15.6h5.5" />
    </svg>
  ),
  Invoices: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h10v15H7zm3 3h4M10 11h4M10 14.5h2.8" />
    </svg>
  ),
  Products: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.8 8.2 12 4.4l7.2 3.8v7.6L12 19.6l-7.2-3.8zm7.2 4 7.2-3.8M12 12.2v7.4" />
    </svg>
  ),
  Inventory: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7.5h14v11H5zm3.2-3h7.6L17 7.5H7zM8.2 12h7.6M8.2 15.4h4.8" />
    </svg>
  ),
  Customers: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12.2A3.6 3.6 0 1 0 12 5a3.6 3.6 0 0 0 0 7.2zM6.2 19.4c.7-2.6 2.8-4 5.8-4s5.1 1.4 5.8 4" />
    </svg>
  ),
  Reports: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19.2h14M7.4 16.4V10M12 16.4V6.8M16.6 16.4v-3.2" />
    </svg>
  ),
};

function Sidebar({ page, navItems, onNavigate, open, onClose }) {
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const onChange = () => { if (!media.matches) onClose(); };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const media = window.matchMedia('(max-width: 900px)');
    const previousOverflow = document.body.style.overflow;
    if (media.matches) document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <button
          className="sidebar-backdrop is-open"
          type="button"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Business desk">
        <div className="sidebar-top">
          <div className="brand">
            <span>G</span>
            <div>
              <strong>Gurukripa</strong>
              <small>TRADING</small>
            </div>
          </div>
          <button className="sidebar-close" type="button" aria-label="Close menu" onClick={onClose}>
            ×
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              className={page === item ? 'active' : ''}
              onClick={() => onNavigate(item)}
              key={item}
              type="button"
              aria-current={page === item ? 'page' : undefined}
            >
              <i>{icons[item]}</i>
              {item}
            </button>
          ))}
        </nav>
        <div className="business">
          <b>GURUKRIPA TRADING</b>
          <small>Ulhasnagar-5</small>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
