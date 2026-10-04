import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, Check, Square, CheckSquare, Search, X, ChevronDown } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label?: string;
  count?: number;
}

interface MultiSelectFilterProps {
  title: string;
  options: MultiSelectOption[] | string[];
  selectedValues: Set<string>;
  onChange: (selected: Set<string>) => void;
  icon?: React.ReactNode;
  width?: number | string;
  placeholder?: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  title,
  options,
  selectedValues,
  onChange,
  icon,
  width = 'auto',
  placeholder = 'Filtrele...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Normalize options to MultiSelectOption[]
  const normalizedOptions: MultiSelectOption[] = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return { ...opt, label: opt.label || opt.value };
    });
  }, [options]);

  // Click outside listener to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const totalCount = normalizedOptions.length;
  const selectedCount = selectedValues.size;
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;
  const isNoneSelected = selectedCount === 0;
  const isPartiallyFiltered = !isAllSelected && !isNoneSelected;

  // Filter options by search term
  const visibleOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter(opt => 
      opt.label?.toLowerCase().includes(term) || opt.value.toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm]);

  const handleToggle = (value: string) => {
    const next = new Set(selectedValues);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    const next = new Set<string>();
    normalizedOptions.forEach(opt => next.add(opt.value));
    onChange(next);
  };

  const handleDeselectAll = () => {
    onChange(new Set<string>());
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '4px 8px',
          fontSize: '0.75rem',
          background: isPartiallyFiltered ? '#0f2942' : '#0b0f19',
          color: isPartiallyFiltered ? '#38bdf8' : (isNoneSelected ? '#f87171' : '#e2e8f0'),
          border: isPartiallyFiltered ? '1px solid #0284c7' : '1px solid #334155',
          cursor: 'pointer'
        }}
        title={`${title}: ${selectedCount}/${totalCount} seçili. Tıklayarak filtreleyin.`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
          {icon || <Filter size={12} style={{ color: isPartiallyFiltered ? '#38bdf8' : '#94a3b8', flexShrink: 0 }} />}
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{title}:</span>
          <span style={{ 
            fontSize: '0.7rem', 
            fontWeight: isPartiallyFiltered ? 700 : 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {isAllSelected && `Tümü (${totalCount})`}
            {isNoneSelected && `Hiçbiri (0)`}
            {isPartiallyFiltered && `${selectedCount}/${totalCount}`}
          </span>
        </div>
        <ChevronDown size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
      </button>

      {/* Checklist Popover */}
      {isOpen && (
        <div
          className="panel-elevated"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 9999,
            minWidth: 260,
            maxWidth: 360,
            marginTop: 2,
            padding: '6px 8px',
            background: '#111827',
            border: '1px solid #334155',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)'
          }}
        >
          {/* Header & Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f293d', paddingBottom: 5, marginBottom: 5 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc' }}>
              {title} Seçimi ({selectedCount}/{totalCount})
            </span>
            <div style={{ display: 'flex', gap: 6, fontSize: '0.68rem' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                Tümünü Seç
              </button>
              <span style={{ color: '#475569' }}>|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                Tümünü Kaldır
              </button>
            </div>
          </div>

          {/* Search Box if list is larger than 5 */}
          {normalizedOptions.length > 5 && (
            <div style={{ position: 'relative', marginBottom: 5 }}>
              <Search size={12} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '3px 20px 3px 22px',
                  fontSize: '0.72rem',
                  background: '#0b0f19',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  outline: 'none'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Checklist */}
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visibleOptions.length === 0 ? (
              <div style={{ padding: '8px 4px', fontSize: '0.72rem', color: '#64748b', textAlign: 'center' }}>
                Eşleşen öğe bulunamadı
              </div>
            ) : (
              visibleOptions.map(opt => {
                const isChecked = selectedValues.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 5px',
                      fontSize: '0.72rem',
                      background: isChecked ? '#1e293b' : 'transparent',
                      color: isChecked ? '#f8fafc' : '#94a3b8',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderLeft: isChecked ? '2px solid #0284c7' : '2px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.background = '#151d2f';
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt.value)}
                      style={{ accentColor: '#0284c7', cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {opt.count !== undefined && (
                      <span style={{ fontSize: '0.65rem', color: '#64748b', background: '#0b0f19', padding: '1px 4px', border: '1px solid #1f293d' }}>
                        {opt.count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer notification */}
          <div style={{ borderTop: '1px solid #1f293d', paddingTop: 4, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
              İşaret kaldırıldığında gizlenir
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-primary"
              style={{ padding: '2px 8px', fontSize: '0.68rem' }}
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
