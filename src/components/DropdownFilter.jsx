import React, { useState, useRef, useEffect } from 'react';

function DropdownFilter({ label, options, selected, onSelect, countFn, optionLabels = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const toggleOption = (val) => {
    onSelect(val);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`flex items-center gap-2 px-4 py-2 rounded border border-gray-300 bg-white shadow-sm text-sm font-medium hover:bg-blue-50 transition-colors ${open ? 'ring-2 ring-blue-200' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            {selected.length}
          </span>
        )}
        <svg className={`ml-1 w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-40 animate-fade-in">
          <ul className="max-h-60 overflow-y-auto py-2">
            {options.map((val) => (
              <li key={val} className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer">
                <label className="flex items-center gap-2 w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(val)}
                    onChange={() => toggleOption(val)}
                    className="accent-blue-600"
                  />
                  <span className="flex-1 text-sm">{optionLabels[val] || val}</span>
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {countFn(val)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DropdownFilter; 