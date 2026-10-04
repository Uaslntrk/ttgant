import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Upload, 
  Columns, 
  Download, 
  Trash2, 
  CheckSquare, 
  Square, 
  RotateCcw,
  Users,
  Building,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  FolderMinus,
  Layers
} from 'lucide-react';
import { CompletedTask } from '../types';

interface CompletedTasksViewProps {
  tasks: CompletedTask[];
  onOpenUpload: () => void;
  onRefresh: () => void;
  onClear: () => void;

  // Shared Filter Props
  selectedTeams: Set<string>;
  setSelectedTeams: (teams: Set<string>) => void;
  selectedTypes: Set<string>;
  setSelectedTypes: (types: Set<string>) => void;
  selectedHizmetler: Set<string>;
  setSelectedHizmetler: (hizmetler: Set<string>) => void;
  selectedStatuses: Set<string>;
  setSelectedStatuses: (statuses: Set<string>) => void;
  selectedAmirlikler: Set<string>;
  setSelectedAmirlikler: (amirlikler: Set<string>) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onResetFilters: () => void;

  availableTeams: string[];
  availableTypes: string[];
  availableHizmetler: string[];
  availableStatuses: string[];
  availableAmirlikler: string[];
}

type ColumnKey = 
  | 'BildirimZamani'
  | 'EkibeAtanmaZamani'
  | 'TamamlanmaZamani'
  | 'IsemriId'
  | 'HizmetNo'
  | 'EkipAdi'
  | 'IsemriTipi'
  | 'HizmetTuru'
  | 'Durumu'
  | 'Lokasyon'
  | 'MudurlukAmirlik'
  | 'Slot'
  | 'KalanEkipSlaSuresi'
  | 'MusteriId'
  | 'EkipNo'
  | 'AltHizmetTuru'
  | 'RandevuZamani'
  | 'IsTuru'
  | 'SiparisKategori'
  | 'ToplamSlaSuresi'
  | 'KalanSlaSuresi'
  | 'EkipSlaSuresi'
  | 'ToplamYkoSuresi'
  | 'YkoOrani'
  | 'AltyapiTipi'
  | 'UcCihazKurulumTipi';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  isCrucial?: boolean;
  color?: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  // 3 CRITICAL DATE HEADERS (Requested by user)
  { key: 'BildirimZamani', label: 'Bildirim Zamanı', isCrucial: true, color: '#38bdf8', defaultVisible: true },
  { key: 'EkibeAtanmaZamani', label: 'Ekibe Atanma Zamanı', isCrucial: true, color: '#fbbf24', defaultVisible: true },
  { key: 'TamamlanmaZamani', label: 'Tamamlanma Zamanı', isCrucial: true, color: '#4ade80', defaultVisible: true },

  // Operational core columns
  { key: 'IsemriId', label: 'İşemri Id', defaultVisible: true },
  { key: 'HizmetNo', label: 'Hizmet No', defaultVisible: true },
  { key: 'EkipAdi', label: 'Saha Ekibi (Ekip Adı)', defaultVisible: true },
  { key: 'IsemriTipi', label: 'İş Emri Tipi', defaultVisible: true },
  { key: 'HizmetTuru', label: 'Hizmet Türü', defaultVisible: true },
  { key: 'Durumu', label: 'Durumu', defaultVisible: true },
  { key: 'Lokasyon', label: 'Lokasyon / Adres', defaultVisible: true },
  { key: 'MudurlukAmirlik', label: 'Müdürlük - Amirlik', defaultVisible: true },
  { key: 'Slot', label: 'Ajandadaki Yeri (Slot)', defaultVisible: true },
  { key: 'KalanEkipSlaSuresi', label: 'Kalan Ekip SLA Süresi', defaultVisible: true },

  // Secondary detailed columns
  { key: 'MusteriId', label: 'Müşteri Id', defaultVisible: false },
  { key: 'EkipNo', label: 'Ekip No', defaultVisible: false },
  { key: 'AltHizmetTuru', label: 'Alt Hizmet Türü', defaultVisible: false },
  { key: 'RandevuZamani', label: 'Randevu Zamanı', defaultVisible: false },
  { key: 'IsTuru', label: 'İş Türü / Alt Tür', defaultVisible: false },
  { key: 'SiparisKategori', label: 'Sipariş Kategori', defaultVisible: false },
  { key: 'ToplamSlaSuresi', label: 'Toplam SLA Süresi', defaultVisible: false },
  { key: 'KalanSlaSuresi', label: 'Kalan SLA Süresi', defaultVisible: false },
  { key: 'EkipSlaSuresi', label: 'Ekip SLA Süresi', defaultVisible: false },
  { key: 'ToplamYkoSuresi', label: 'Toplam YKO Süresi', defaultVisible: false },
  { key: 'YkoOrani', label: 'YKO Oranı', defaultVisible: false },
  { key: 'AltyapiTipi', label: 'Altyapı Tipi', defaultVisible: false },
  { key: 'UcCihazKurulumTipi', label: 'Uç Cihaz Kurulum', defaultVisible: false }
];

import { MultiSelectFilter } from './MultiSelectFilter';
import { exportToExcel } from '../utils/excelExporter';

export const CompletedTasksView: React.FC<CompletedTasksViewProps> = ({
  tasks,
  onOpenUpload,
  onRefresh,
  onClear,
  selectedTeams,
  setSelectedTeams,
  selectedTypes,
  setSelectedTypes,
  selectedHizmetler,
  setSelectedHizmetler,
  selectedStatuses,
  setSelectedStatuses,
  selectedAmirlikler,
  setSelectedAmirlikler,
  searchTerm,
  setSearchTerm,
  onResetFilters,
  availableTeams,
  availableTypes,
  availableHizmetler,
  availableStatuses,
  availableAmirlikler
}) => {
  // Column visibility state (initialized from localStorage or defaults)
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem('completed_tasks_visible_cols');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    const initial: Record<string, boolean> = {};
    ALL_COLUMNS.forEach(col => {
      initial[col.key] = col.defaultVisible;
    });
    return initial as Record<ColumnKey, boolean>;
  });

  const [showColPicker, setShowColPicker] = useState<boolean>(false);

  // Distinct values for filter dropdowns (derived from available lists)
  const teamsList = availableTeams;
  const typesList = availableTypes;
  const hizmetList = availableHizmetler;
  const statusesList = availableStatuses;
  const amirlikList = availableAmirlikler;

  // Sorting
  const [sortField, setSortField] = useState<ColumnKey>('TamamlanmaZamani');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Save visibility preferences
  useEffect(() => {
    try {
      localStorage.setItem('completed_tasks_visible_cols', JSON.stringify(visibleColumns));
    } catch (e) {}
  }, [visibleColumns]);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const setAllColumns = (val: boolean) => {
    const next: Record<string, boolean> = {};
    ALL_COLUMNS.forEach(col => {
      next[col.key] = val;
    });
    setVisibleColumns(next as Record<ColumnKey, boolean>);
  };

  const resetToDefaultColumns = () => {
    const initial: Record<string, boolean> = {};
    ALL_COLUMNS.forEach(col => {
      initial[col.key] = col.defaultVisible;
    });
    setVisibleColumns(initial as Record<ColumnKey, boolean>);
  };

  // Filter tasks (items unchecked by user are excluded)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const tTeam = (task.EkipAdi || '').trim();
      if (teamsList.length > 0 && !selectedTeams.has(tTeam)) return false;

      const tType = (task.IsemriTipi || '').trim();
      if (typesList.length > 0 && !selectedTypes.has(tType)) return false;

      const tHizmet = (task.HizmetTuru || '').trim();
      if (hizmetList.length > 0 && !selectedHizmetler.has(tHizmet)) return false;

      const tStatus = (task.Durumu || '').trim();
      if (statusesList.length > 0 && !selectedStatuses.has(tStatus)) return false;

      const tAmirlik = (task.MudurlukAmirlik || '').trim();
      if (amirlikList.length > 0 && !selectedAmirlikler.has(tAmirlik)) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesId = (task.IsemriId || '').toLowerCase().includes(q);
        const matchesHzm = (task.HizmetNo || '').toLowerCase().includes(q);
        const matchesCust = (task.MusteriId || '').toLowerCase().includes(q);
        const matchesTeam = (task.EkipAdi || '').toLowerCase().includes(q);
        const matchesLoc = (task.Lokasyon || '').toLowerCase().includes(q);
        const matchesType = (task.IsemriTipi || '').toLowerCase().includes(q);
        if (!matchesId && !matchesHzm && !matchesCust && !matchesTeam && !matchesLoc && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, teamsList, selectedTeams, typesList, selectedTypes, hizmetList, selectedHizmetler, statusesList, selectedStatuses, amirlikList, selectedAmirlikler, searchTerm]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const valA = (a[sortField] || '').toString();
      const valB = (b[sortField] || '').toString();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredTasks, sortField, sortAsc]);

  // Group sortedTasks by HizmetNo
  const [expandedHizmetler, setExpandedHizmetler] = useState<Set<string>>(() => new Set());

  const { hizmetGroups, duplicateGroupCount, totalItemCount } = useMemo(() => {
    const map = new Map<string, CompletedTask[]>();
    const order: string[] = [];

    sortedTasks.forEach(task => {
      const key = (task.HizmetNo || '').trim() || `unspecified_${task.id || Math.random()}`;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(task);
    });

    let dupCount = 0;
    const groups = order.map(key => {
      const items = map.get(key)!;
      const isGroup = items.length > 1 && !key.startsWith('unspecified_');
      if (isGroup) dupCount++;
      return {
        key,
        hizmetNo: key.startsWith('unspecified_') ? '' : key,
        items,
        isGroup
      };
    });

    return {
      hizmetGroups: groups,
      duplicateGroupCount: dupCount,
      totalItemCount: sortedTasks.length
    };
  }, [sortedTasks]);

  // Dynamic visible count: Collapsed group = 1 row; Expanded group = all child rows
  const visibleTaskCount = useMemo(() => {
    let count = 0;
    hizmetGroups.forEach(g => {
      if (g.isGroup) {
        if (expandedHizmetler.has(g.hizmetNo)) {
          count += g.items.length;
        } else {
          count += 1;
        }
      } else {
        count += g.items.length;
      }
    });
    return count;
  }, [hizmetGroups, expandedHizmetler]);

  const toggleGroup = (hNo: string) => {
    setExpandedHizmetler(prev => {
      const next = new Set(prev);
      if (next.has(hNo)) {
        next.delete(hNo);
      } else {
        next.add(hNo);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    const all = new Set<string>();
    hizmetGroups.forEach(g => {
      if (g.isGroup) all.add(g.hizmetNo);
    });
    setExpandedHizmetler(all);
  };

  const collapseAllGroups = () => {
    setExpandedHizmetler(new Set());
  };

  const handleSort = (key: ColumnKey) => {
    if (sortField === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(key);
      setSortAsc(true);
    }
  };

  const handleResetFilters = () => {
    onResetFilters();
  };

  const hasFilters = searchTerm !== '' || 
    (teamsList.length > 0 && selectedTeams.size < teamsList.length) ||
    (typesList.length > 0 && selectedTypes.size < typesList.length) ||
    (hizmetList.length > 0 && selectedHizmetler.size < hizmetList.length) ||
    (statusesList.length > 0 && selectedStatuses.size < statusesList.length) ||
    (amirlikList.length > 0 && selectedAmirlikler.size < amirlikList.length);

  // Professional Excel (.xlsx) export of filtered data and visible columns
  const handleExportExcel = () => {
    const activeCols = ALL_COLUMNS.filter(c => visibleColumns[c.key]);
    exportToExcel({
      filename: `Yapilan_Isler_Filtrelenmis_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Yapılan İşler',
      data: sortedTasks,
      columns: activeCols.map(c => ({
        key: c.key,
        header: c.label,
        width: c.key.includes('Zamani') ? 22 : (c.key === 'Lokasyon' ? 35 : 18)
      }))
    });
  };

  // Export visible data to CSV (legacy fallback)
  const handleExportCSV = () => {
    const activeCols = ALL_COLUMNS.filter(c => visibleColumns[c.key]);
    const headerRow = activeCols.map(c => `"${c.label}"`).join(',');
    const dataRows = sortedTasks.map(t => {
      return activeCols.map(c => {
        const val = (t[c.key] || '').toString().replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
    });
    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Yapilan_Isler_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* 1. Control & Filter Toolbar - Flat Enterprise */}
      <div 
        className="panel" 
        style={{ 
          padding: '8px 10px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 6,
          background: '#0d131f'
        }}
      >
        {/* Row 1: Actions, Column Selector, Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="İşemri Id / Hzm No / Adres..."
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 26, paddingTop: 4, paddingBottom: 4, fontSize: '0.78rem' }}
              />
            </div>

            {/* SÜTUN SEÇİCİ ("Şunu Göster / Şunu Gösterme") */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowColPicker(!showColPicker)}
                className="btn btn-secondary"
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '0.78rem',
                  borderColor: showColPicker ? '#0284c7' : '#334155'
                }}
              >
                <Columns size={13} style={{ color: '#38bdf8' }} />
                <span>Sütunları Seç (Göster / Gizle)</span>
              </button>

              {showColPicker && (
                <div
                  className="panel-elevated"
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    width: 320,
                    zIndex: 9999,
                    padding: 8,
                    background: '#111827',
                    border: '1px solid #334155',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.8)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f293d', paddingBottom: 6, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#f8fafc' }}>
                      Tabloda Gösterilecek Sütunlar
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => setAllColumns(true)}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.7rem', cursor: 'pointer' }}
                      >
                        Tümü
                      </button>
                      <span style={{ color: '#475569' }}>|</span>
                      <button
                        type="button"
                        onClick={resetToDefaultColumns}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer' }}
                      >
                        Varsayılan
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {ALL_COLUMNS.map(col => {
                      const isVisible = visibleColumns[col.key];
                      return (
                        <label
                          key={col.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.72rem',
                            color: col.isCrucial ? (col.color || '#38bdf8') : (isVisible ? '#f8fafc' : '#64748b'),
                            cursor: 'pointer',
                            padding: '2px 4px',
                            background: isVisible ? '#1e293b' : 'transparent',
                            fontWeight: col.isCrucial ? 700 : 500
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleColumn(col.key)}
                            style={{ accentColor: '#0284c7' }}
                          />
                          <span>{col.label}</span>
                          {col.isCrucial && (
                            <span style={{ fontSize: '0.62rem', background: '#082f49', color: '#38bdf8', padding: '0 3px', marginLeft: 'auto' }}>
                              Önemli
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  <div style={{ borderTop: '1px solid #1f293d', paddingTop: 6, marginTop: 6, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setShowColPicker(false)}
                      className="btn btn-primary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                    >
                      Uygula
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Filters */}
            {hasFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Filtreleri Sıfırla"
              >
                <RotateCcw size={11} /> Sıfırla
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={onOpenUpload}
              className="btn btn-primary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              <Upload size={13} /> Yapılan İşler Exceli Yükle
            </button>

            {sortedTasks.length > 0 && (
              <button
                type="button"
                onClick={handleExportExcel}
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.78rem', background: '#16a34a', borderColor: '#16a34a' }}
                title="Görünen filtrelenmiş verileri profesyonel Excel (.xlsx) formatında indir"
              >
                <Download size={13} /> Excele Aktar (.xlsx)
              </button>
            )}

            {sortedTasks.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                title="CSV formatında indir"
              >
                CSV
              </button>
            )}

            {tasks.length > 0 && (
              <button
                onClick={onClear}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.78rem', color: '#f87171' }}
                title="Yapılan işler veritabanını temizle"
              >
                <Trash2 size={13} />
              </button>
            )}

            {duplicateGroupCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#111827', padding: '2px 4px', border: '1px solid #1f293d' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Layers size={11} style={{ color: '#38bdf8' }} /> {duplicateGroupCount} Grup:
                </span>
                <button
                  type="button"
                  onClick={expandAllGroups}
                  className="btn btn-secondary"
                  style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                  title="Aynı Hizmet No'ya ait tüm gruplanmış işemirlerini aç"
                >
                  <FolderPlus size={11} style={{ color: '#38bdf8' }} /> Tümünü Aç
                </button>
                <button
                  type="button"
                  onClick={collapseAllGroups}
                  className="btn btn-secondary"
                  style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                  title="Aynı Hizmet No'ya ait tüm grupları kapat"
                >
                  <FolderMinus size={11} style={{ color: '#94a3b8' }} /> Tümünü Kapat
                </button>
              </div>
            )}

            <span 
              style={{
                fontSize: '0.75rem',
                background: '#0b0f19',
                color: '#38bdf8',
                padding: '3px 8px',
                fontWeight: 700,
                border: '1px solid #1f293d'
              }}
              title={`Açık olduğunda toplam ${totalItemCount} iş emri, kapalı olduğunda ${visibleTaskCount} kayıt listelenir.`}
            >
              {visibleTaskCount} / {tasks.length} Yapılan İş ({totalItemCount} Toplam İş Emri)
            </span>
          </div>
        </div>

        {/* Row 2: Category & Dimension Multi-Select Checklist Filters (All Checked by Default) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderTop: '1px solid #1f293d', paddingTop: 6 }}>
          {/* Ekip MultiSelect Checklist */}
          {teamsList.length > 0 && (
            <MultiSelectFilter
              title="Ekip"
              icon={<Users size={12} style={{ color: '#38bdf8' }} />}
              options={teamsList.map(t => ({
                value: t,
                label: t,
                count: tasks.filter(task => task.EkipAdi === t).length
              }))}
              selectedValues={selectedTeams}
              onChange={setSelectedTeams}
              placeholder="Ekip ara..."
            />
          )}

          {/* İş Emri Tipi MultiSelect Checklist */}
          {typesList.length > 0 && (
            <MultiSelectFilter
              title="İş Emri Tipi"
              options={typesList.map(t => ({
                value: t,
                label: t,
                count: tasks.filter(task => task.IsemriTipi === t).length
              }))}
              selectedValues={selectedTypes}
              onChange={setSelectedTypes}
              placeholder="İş tipi ara..."
            />
          )}

          {/* Hizmet Türü MultiSelect Checklist */}
          {hizmetList.length > 0 && (
            <MultiSelectFilter
              title="Hizmet Türü"
              options={hizmetList.map(h => ({
                value: h,
                label: h,
                count: tasks.filter(task => task.HizmetTuru === h).length
              }))}
              selectedValues={selectedHizmetler}
              onChange={setSelectedHizmetler}
              placeholder="Hizmet ara..."
            />
          )}

          {/* Durumu MultiSelect Checklist */}
          {statusesList.length > 0 && (
            <MultiSelectFilter
              title="Durumu"
              options={statusesList.map(s => ({
                value: s,
                label: s,
                count: tasks.filter(task => task.Durumu === s).length
              }))}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Durum ara..."
            />
          )}

          {/* Müdürlük/Amirlik MultiSelect Checklist */}
          {amirlikList.length > 0 && (
            <MultiSelectFilter
              title="Amirlik"
              icon={<Building size={12} style={{ color: '#fbbf24' }} />}
              options={amirlikList.map(a => ({
                value: a,
                label: a,
                count: tasks.filter(task => task.MudurlukAmirlik === a).length
              }))}
              selectedValues={selectedAmirlikler}
              onChange={setSelectedAmirlikler}
              placeholder="Amirlik ara..."
            />
          )}

          {/* Notice for 3 Crucial Columns */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>■ Bildirim Zamanı</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>■ Ekibe Atanma</span>
            <span style={{ color: '#4ade80', fontWeight: 700 }}>■ Tamamlanma Zamanı</span>
          </div>
        </div>
      </div>

      {/* 2. High-Density Completed Tasks Table */}
      <div style={{ 
        overflowX: 'auto', 
        maxHeight: 'calc(100vh - 180px)',
        border: '1px solid #1f293d',
        background: '#0a0e17'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: '#111827', borderBottom: '2px solid #334155', color: '#94a3b8' }}>
              {ALL_COLUMNS.filter(col => visibleColumns[col.key]).map(col => {
                const isSorted = sortField === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: '7px 8px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: col.isCrucial ? '#1e293b' : '#111827',
                      color: col.color || (col.isCrucial ? '#38bdf8' : '#cbd5e1'),
                      borderRight: '1px solid #1f293d',
                      fontWeight: 700
                    }}
                    title={`${col.label} göre sırala`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>{col.label}</span>
                      <ArrowUpDown size={11} style={{ opacity: isSorted ? 1 : 0.4 }} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td 
                  colSpan={ALL_COLUMNS.filter(c => visibleColumns[c.key]).length || 1}
                  style={{ padding: '40px 10px', textAlign: 'center', color: '#64748b' }}
                >
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 6 }}>
                    Kayıtlı yapılan iş bulunamadı.
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 12 }}>
                    Lütfen "Yapılan İşler Exceli Yükle" butonunu kullanarak tamamlanan işler raporunuzu aktarın.
                  </div>
                  <button
                    onClick={onOpenUpload}
                    className="btn btn-primary"
                    style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                  >
                    <Upload size={13} /> Excel Raporu Yükle
                  </button>
                </td>
              </tr>
            ) : (
              hizmetGroups.map(group => {
                const activeCols = ALL_COLUMNS.filter(c => visibleColumns[c.key]);

                // SINGLE TASK
                if (!group.isGroup) {
                  const task = group.items[0];
                  return (
                    <tr
                      key={task.id || group.key}
                      style={{
                        borderBottom: '1px solid #1f293d',
                        background: '#0d131f'
                      }}
                    >
                      {activeCols.map(col => {
                        const val = task[col.key] || '-';

                        let cellStyle: React.CSSProperties = {
                          padding: '6px 8px',
                          borderRight: '1px solid #1f293d',
                          whiteSpace: 'nowrap'
                        };

                        if (col.key === 'BildirimZamani') {
                          cellStyle.color = '#38bdf8';
                          cellStyle.fontWeight = 700;
                          cellStyle.background = '#0a192f';
                        } else if (col.key === 'EkibeAtanmaZamani') {
                          cellStyle.color = '#fbbf24';
                          cellStyle.fontWeight = 700;
                          cellStyle.background = '#1a1910';
                        } else if (col.key === 'TamamlanmaZamani') {
                          cellStyle.color = '#4ade80';
                          cellStyle.fontWeight = 800;
                          cellStyle.background = '#0d2818';
                        } else if (col.key === 'Durumu') {
                          cellStyle.color = val === 'Tamamlandı' ? '#4ade80' : '#f87171';
                          cellStyle.fontWeight = 700;
                        } else if (col.key === 'IsemriId' || col.key === 'HizmetNo') {
                          cellStyle.fontWeight = 700;
                          cellStyle.color = '#f8fafc';
                        } else if (col.key === 'Lokasyon') {
                          cellStyle.maxWidth = 200;
                          cellStyle.overflow = 'hidden';
                          cellStyle.textOverflow = 'ellipsis';
                        }

                        return (
                          <td key={col.key} style={cellStyle} title={String(val)}>
                            {String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }

                // MULTIPLE TASKS WITH SAME HIZMET NO (Collapsible Group)
                const isExpanded = expandedHizmetler.has(group.hizmetNo);
                const firstTask = group.items[0];
                const allTypes = Array.from(new Set(group.items.map(t => t.IsemriTipi).filter(Boolean))).join(', ');
                const allHizmetler = Array.from(new Set(group.items.map(t => t.HizmetTuru).filter(Boolean))).join(', ');

                return (
                  <React.Fragment key={`group_comp_${group.hizmetNo}`}>
                    {/* MASTER ROW */}
                    <tr
                      onClick={() => toggleGroup(group.hizmetNo)}
                      style={{
                        borderBottom: '1px solid #1f293d',
                        background: isExpanded ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.16)',
                        borderLeft: '4px solid #38bdf8',
                        cursor: 'pointer'
                      }}
                      title="Aynı Hizmet No'ya ait işemirlerini açmak / kapatmak için tıklayın"
                    >
                      {activeCols.map(col => {
                        let content: React.ReactNode = firstTask[col.key] || '-';
                        let cellStyle: React.CSSProperties = {
                          padding: '6px 8px',
                          borderRight: '1px solid #1f293d',
                          whiteSpace: 'nowrap'
                        };

                        if (col.key === 'HizmetNo') {
                          content = (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isExpanded ? (
                                <ChevronDown size={14} style={{ color: '#38bdf8' }} />
                              ) : (
                                <ChevronRight size={14} style={{ color: '#38bdf8' }} />
                              )}
                              <span style={{ fontWeight: 800, color: '#38bdf8', textDecoration: 'underline' }}>
                                {group.hizmetNo}
                              </span>
                              <span style={{
                                fontSize: '0.65rem',
                                background: isExpanded ? '#0369a1' : '#0284c7',
                                color: '#ffffff',
                                padding: '1px 6px',
                                fontWeight: 700
                              }}>
                                {group.items.length} İş Emri {isExpanded ? '▼ Açık' : '▶ Kapalı'}
                              </span>
                            </div>
                          );
                        } else if (col.key === 'IsemriId') {
                          content = (
                            <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                              {group.items.length} Farklı İş Emri
                            </span>
                          );
                        } else if (col.key === 'IsemriTipi') {
                          content = (
                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                              {allTypes}
                            </span>
                          );
                        } else if (col.key === 'HizmetTuru') {
                          content = allHizmetler || '-';
                        } else if (col.key === 'TamamlanmaZamani') {
                          cellStyle.color = '#4ade80';
                          cellStyle.fontWeight = 800;
                        } else if (col.key === 'BildirimZamani') {
                          cellStyle.color = '#38bdf8';
                          cellStyle.fontWeight = 700;
                        } else if (col.key === 'EkibeAtanmaZamani') {
                          cellStyle.color = '#fbbf24';
                          cellStyle.fontWeight = 700;
                        }

                        return (
                          <td key={col.key} style={cellStyle}>
                            {content}
                          </td>
                        );
                      })}
                    </tr>

                    {/* CHILD TASKS */}
                    {isExpanded && group.items.map((task, cIdx) => (
                      <tr
                        key={task.id || `${group.hizmetNo}_child_${cIdx}`}
                        style={{
                          borderBottom: '1px solid #1f293d',
                          background: cIdx % 2 === 0 ? '#0b111e' : '#0e1626',
                          borderLeft: '4px solid #1e3a5f',
                          fontSize: '0.72rem'
                        }}
                      >
                        {activeCols.map(col => {
                          const val = task[col.key] || '-';
                          let cellStyle: React.CSSProperties = {
                            padding: '4px 8px',
                            borderRight: '1px solid #1f293d',
                            whiteSpace: 'nowrap'
                          };

                          if (col.key === 'HizmetNo') {
                            return (
                              <td key={col.key} style={{ ...cellStyle, paddingLeft: 24, color: '#94a3b8' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>↳</span>
                                  <span>İş Emri #{cIdx + 1}</span>
                                </div>
                              </td>
                            );
                          }

                          if (col.key === 'TamamlanmaZamani') {
                            cellStyle.color = '#4ade80';
                          } else if (col.key === 'BildirimZamani') {
                            cellStyle.color = '#38bdf8';
                          } else if (col.key === 'EkibeAtanmaZamani') {
                            cellStyle.color = '#fbbf24';
                          } else if (col.key === 'Durumu') {
                            cellStyle.color = val === 'Tamamlandı' ? '#4ade80' : '#f87171';
                          }

                          return (
                            <td key={col.key} style={cellStyle} title={String(val)}>
                              {String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
