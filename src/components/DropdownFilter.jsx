import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

function DropdownFilter({ label, options, selected, onSelect, countFn, optionLabels = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const btnRef = useRef();
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = () => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleScroll = () => {
      if (open) updatePosition();
    };
    const handleResize = () => {
      if (open) updatePosition();
    };
    
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      updatePosition();
      // Add a small delay to ensure layout is stable
      const timeoutId = setTimeout(updatePosition, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [open, selected]);

  useEffect(() => {
    console.log('DropdownFilter', label, 'selected:', selected);
  }, [selected]);

  const toggleOption = (val) => {
    console.log('DropdownFilter', label, 'onSelect called with:', val);
    onSelect(val);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        className={`flex items-center gap-2 px-2 py-1 rounded-full border border-blue-300 bg-white shadow text-xs font-medium text-gray-700 hover:bg-blue-50 transition-all duration-150 mb-1 w-full ${open ? 'ring-2 ring-blue-200' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        ref={btnRef}
      >
        <span className="flex items-center">{label}</span>
        {selected.length > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 ml-1">{selected.length}</span>
        )}
        <svg className={`ml-1 w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} flex-shrink-0`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M19 9l-7 7-7-7"/></svg>
      </button>
      {open && createPortal(
        <div
          className="absolute z-50 mt-2 w-52 min-w-[208px] bg-white border border-blue-300 rounded-2xl shadow-xl animate-fade-in"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width > 208 ? dropdownPos.width : 208,
            position: 'absolute'
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <ul className="max-h-60 overflow-y-auto py-2 bg-white">
            {options.map((val) => (
              <li key={val} className="flex items-center px-4 py-2 bg-white hover:bg-blue-50 cursor-pointer transition-colors duration-100">
                <label className="flex items-center gap-2 w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(val)}
                    onChange={() => toggleOption(val)}
                    className="accent-blue-600 self-center mt-0"
                  />
                  <span className="flex-1 text-sm">{optionLabels[val] || val}</span>
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {countFn(val)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

export default DropdownFilter; 