import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function SearchPicker({
  value,
  items,
  getId,
  getSearchText,
  renderValue,
  renderOption,
  placeholder,
  emptyText = 'No matches',
  disabled = false,
  onChange,
  afterSelect,
  focusSignal,
}) {
  const triggerId = useId();
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [box, setBox] = useState(null);
  const selected = items.find((item) => getId(item) === value);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(needle));
  }, [items, query, getSearchText]);

  useEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const node = triggerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const maxHeight = Math.min(320, window.innerHeight - rect.bottom - 16);
      const top = rect.bottom + 6;
      const left = Math.min(rect.left, window.innerWidth - rect.width - 12);
      setBox({ top, left: Math.max(12, left), width: rect.width, maxHeight: Math.max(160, maxHeight) });
    };
    update();
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (event.target.closest?.('.search-picker-panel')) return;
      setOpen(false);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('pointerdown', onPointerDown);
    window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!focusSignal || disabled) return undefined;
    setOpen(true);
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [focusSignal, disabled]);

  const choose = (item) => {
    if (item.disabled) return;
    onChange(getId(item));
    setOpen(false);
    afterSelect?.();
  };

  return (
    <div className={`search-picker${open ? ' is-open' : ''}${selected ? ' has-value' : ''}`}>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className="search-picker-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((current) => !current)}
      >
        {selected ? renderValue(selected) : <span className="search-picker-placeholder">{placeholder}</span>}
      </button>
      {selected && !disabled && (
        <button type="button" className="search-picker-clear" aria-label="Clear selection" onClick={() => onChange('')}>
          ×
        </button>
      )}
      {open && box && createPortal(
        <div className="search-picker-panel" style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }} role="listbox" aria-labelledby={triggerId}>
          <input
            ref={searchRef}
            className="search-picker-search"
            value={query}
            placeholder="Type to search"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
              if (event.key === 'Enter' && matches[0] && !matches[0].disabled) {
                event.preventDefault();
                choose(matches[0]);
              }
            }}
          />
          <div className="search-picker-list">
            {matches.map((item) => (
              <button
                key={getId(item)}
                type="button"
                role="option"
                className={`search-picker-option${getId(item) === value ? ' is-selected' : ''}${item.disabled ? ' is-disabled' : ''}`}
                disabled={item.disabled}
                onClick={() => choose(item)}
              >
                {renderOption(item)}
              </button>
            ))}
            {!matches.length && <p className="search-picker-empty">{emptyText}</p>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default SearchPicker;
