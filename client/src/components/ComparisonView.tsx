import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  GitCompare, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  ArrowUpDown, 
  Check, 
  Filter,
  BarChart2,
  Calendar,
  FileSpreadsheet,
  RotateCcw,
  Building,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  FolderMinus,
  Layers
} from 'lucide-react';
import { Task, CompletedTask, Team } from '../types';
import { MultiSelectFilter } from './MultiSelectFilter';
import { exportToExcel } from '../utils/excelExporter';

interface ComparisonViewProps {
  tasks: Task[]; // Bekleyen İşler
  completedTasks: CompletedTask[]; // Yapılan İşler
  teams: Team[];
  
  // Shared Filter Props (Shared with CompletedTasksView & App.tsx)
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

export type MatchStatus = 'MATCHED' | 'ONLY_PENDING' | 'ONLY_COMPLETED';

export interface ComparisonRow {
  key: string;
  hizmetNo: string;
  ekipAdi: string;
  pendingTeam: string;
  completedTeam: string;
  matchStatus: MatchStatus;
  statusLabel: string;
  
  // Pending task info
  pendingTaskId?: string;
  pendingTaskType?: string;
  pendingAmirlik?: string;
  pendingStartTime?: string;
  pendingEndTime?: string;
  pendingAddress?: string;
  pendingSantral?: string;
  
  // Completed task info
  completedIsemriId?: string;
  completedIsemriTipi?: string;
  completedHizmetTuru?: string;
  completedAmirlik?: string;
  completedBildirimZamani?: string;
  completedAtanmaZamani?: string;
  completedTamamlanmaZamani?: string;
  completedLokasyon?: string;
  completedDurumu?: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  tasks,
  completedTasks,
  teams,
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
  const tableRef = useRef<HTMLDivElement | null>(null);

  // Normalize strings
  const normalize = (val?: string) => (val || '').trim();

  // Internal match status filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | MatchStatus>('ALL');
  const [sortField, setSortField] = useState<keyof ComparisonRow>('hizmetNo');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Expand / Collapse State for duplicate HizmetNo groups
  const [expandedHizmetler, setExpandedHizmetler] = useState<Set<string>>(() => new Set());

  // 1. Perform cross-matching based on HizmetNo
  const { comparisonRows, stats } = useMemo(() => {
    // Map completed tasks by HizmetNo
    const completedByHizmet = new Map<string, CompletedTask[]>();
    completedTasks.forEach(c => {
      const hNo = normalize(c.HizmetNo);
      if (hNo) {
        if (!completedByHizmet.has(hNo)) {
          completedByHizmet.set(hNo, []);
        }
        completedByHizmet.get(hNo)!.push(c);
      }
    });

    // Map pending tasks by HizmetNo
    const pendingByHizmet = new Map<string, Task[]>();
    tasks.forEach(t => {
      const hNo = normalize(t.HizmetNo || t.TaskId);
      if (hNo) {
        if (!pendingByHizmet.has(hNo)) {
          pendingByHizmet.set(hNo, []);
        }
        pendingByHizmet.get(hNo)!.push(t);
      }
    });

    const rows: ComparisonRow[] = [];
    const processedCompletedKeys = new Set<string>();

    let matchedCount = 0;
    let onlyPendingCount = 0;
    let onlyCompletedCount = 0;

    // Process all pending tasks
    pendingByHizmet.forEach((pList, hNo) => {
      const p = pList[0];
      const cList = completedByHizmet.get(hNo);

      if (cList && cList.length > 0) {
        // MATCHED: Both in Pending and Completed
        matchedCount++;
        cList.forEach((c, idx) => {
          processedCompletedKeys.add(`${hNo}_${c.IsemriId || idx}`);
          const pTeam = normalize(p.TeamName);
          const cTeam = normalize(c.EkipAdi);
          const displayTeam = cTeam || pTeam || 'Bilinmiyor';

          rows.push({
            key: `matched_${hNo}_${p.TaskId}_${c.IsemriId || idx}`,
            hizmetNo: hNo,
            ekipAdi: displayTeam,
            pendingTeam: pTeam,
            completedTeam: cTeam,
            matchStatus: 'MATCHED',
            statusLabel: 'Eşleşti (Sahada Tamamlandı & Bekleyende Açık)',
            pendingTaskId: p.TaskId,
            pendingTaskType: p.TaskType,
            pendingAmirlik: normalize(p.Amirlik),
            pendingStartTime: p.StartTime,
            pendingEndTime: p.EndTime,
            pendingAddress: p.HizmetAdresi,
            pendingSantral: p.Santral,
            completedIsemriId: c.IsemriId,
            completedIsemriTipi: c.IsemriTipi,
            completedHizmetTuru: c.HizmetTuru,
            completedAmirlik: normalize(c.MudurlukAmirlik),
            completedBildirimZamani: c.BildirimZamani,
            completedAtanmaZamani: c.EkibeAtanmaZamani,
            completedTamamlanmaZamani: c.TamamlanmaZamani,
            completedLokasyon: c.Lokasyon,
            completedDurumu: c.Durumu
          });
        });
      } else {
        // ONLY PENDING
        onlyPendingCount++;
        const pTeam = normalize(p.TeamName) || 'Atanmamış';
        rows.push({
          key: `pending_${hNo}_${p.TaskId}`,
          hizmetNo: hNo,
          ekipAdi: pTeam,
          pendingTeam: pTeam,
          completedTeam: '',
          matchStatus: 'ONLY_PENDING',
          statusLabel: 'Sadece Bekleyen (Henüz Yapılmadı)',
          pendingTaskId: p.TaskId,
          pendingTaskType: p.TaskType,
          pendingAmirlik: normalize(p.Amirlik),
          pendingStartTime: p.StartTime,
          pendingEndTime: p.EndTime,
          pendingAddress: p.HizmetAdresi,
          pendingSantral: p.Santral
        });
      }
    });

    // Process remaining completed tasks not in pending
    completedByHizmet.forEach((cList, hNo) => {
      cList.forEach((c, idx) => {
        const itemKey = `${hNo}_${c.IsemriId || idx}`;
        if (!processedCompletedKeys.has(itemKey)) {
          onlyCompletedCount++;
          const cTeam = normalize(c.EkipAdi) || 'Bilinmiyor';
          rows.push({
            key: `completed_${hNo}_${c.IsemriId || idx}`,
            hizmetNo: hNo,
            ekipAdi: cTeam,
            pendingTeam: '',
            completedTeam: cTeam,
            matchStatus: 'ONLY_COMPLETED',
            statusLabel: 'Sadece Yapılan (Bekleyen Havuzunda Yok)',
            completedIsemriId: c.IsemriId,
            completedIsemriTipi: c.IsemriTipi,
            completedHizmetTuru: c.HizmetTuru,
            completedAmirlik: normalize(c.MudurlukAmirlik),
            completedBildirimZamani: c.BildirimZamani,
            completedAtanmaZamani: c.EkibeAtanmaZamani,
            completedTamamlanmaZamani: c.TamamlanmaZamani,
            completedLokasyon: c.Lokasyon,
            completedDurumu: c.Durumu
          });
        }
      });
    });

    return {
      comparisonRows: rows,
      stats: {
        totalRows: rows.length,
        matchedCount,
        onlyPendingCount,
        onlyCompletedCount,
        totalPending: tasks.length,
        totalCompleted: completedTasks.length
      }
    };
  }, [tasks, completedTasks]);

  // 2. Team-level breakdown statistics
  const teamBreakdown = useMemo(() => {
    const map = new Map<string, {
      ekipAdi: string;
      pendingCount: number;
      completedCount: number;
      matchedCount: number;
      completionRate: number;
    }>();

    availableTeams.forEach(tName => {
      map.set(tName, {
        ekipAdi: tName,
        pendingCount: 0,
        completedCount: 0,
        matchedCount: 0,
        completionRate: 0
      });
    });

    tasks.forEach(t => {
      const name = normalize(t.TeamName) || 'Atanmamış';
      if (!map.has(name)) map.set(name, { ekipAdi: name, pendingCount: 0, completedCount: 0, matchedCount: 0, completionRate: 0 });
      map.get(name)!.pendingCount++;
    });

    completedTasks.forEach(c => {
      const name = normalize(c.EkipAdi) || 'Bilinmiyor';
      if (!map.has(name)) map.set(name, { ekipAdi: name, pendingCount: 0, completedCount: 0, matchedCount: 0, completionRate: 0 });
      map.get(name)!.completedCount++;
    });

    comparisonRows.forEach(r => {
      if (r.matchStatus === 'MATCHED') {
        const teamKey = normalize(r.completedTeam) || normalize(r.pendingTeam) || normalize(r.ekipAdi);
        if (map.has(teamKey)) {
          map.get(teamKey)!.matchedCount++;
        }
      }
    });

    return Array.from(map.values()).map(item => {
      const totalPool = item.pendingCount + (item.completedCount - item.matchedCount);
      const rate = totalPool > 0 ? Math.round((item.completedCount / totalPool) * 100) : 0;
      return {
        ...item,
        completionRate: rate
      };
    }).sort((a, b) => b.completedCount - a.completedCount);
  }, [availableTeams, tasks, completedTasks, comparisonRows]);

  // 3. Handle "Sadece Bu Ekip" Click
  const handleSelectOnlyTeam = (teamName: string) => {
    const norm = normalize(teamName);
    if (selectedTeams.size === 1 && selectedTeams.has(norm)) {
      // Toggle back to all teams if clicked again
      setSelectedTeams(new Set(availableTeams));
    } else {
      setSelectedTeams(new Set([norm]));
    }
    setTimeout(() => {
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // 4. Filtered Rows (Applying all shared & view filters)
  const filteredRows = useMemo(() => {
    return comparisonRows.filter(row => {
      // Team filter (Checklist / Sadece Bu Ekip)
      if (availableTeams.length > 0 && selectedTeams.size < availableTeams.length) {
        const rowPending = normalize(row.pendingTeam);
        const rowCompleted = normalize(row.completedTeam);
        const rowEkip = normalize(row.ekipAdi);

        const matchesTeam = 
          (rowCompleted && selectedTeams.has(rowCompleted)) ||
          (rowPending && selectedTeams.has(rowPending)) ||
          (rowEkip && selectedTeams.has(rowEkip));

        if (!matchesTeam) return false;
      }

      // Quick match status filter
      if (statusFilter !== 'ALL' && row.matchStatus !== statusFilter) {
        return false;
      }

      // Work order type filter
      if (availableTypes.length > 0 && selectedTypes.size < availableTypes.length) {
        const cType = normalize(row.completedIsemriTipi);
        const pType = normalize(row.pendingTaskType);
        const matchesType = (cType && selectedTypes.has(cType)) || (pType && selectedTypes.has(pType));
        if (!matchesType) return false;
      }

      // Hizmet türü filter
      if (availableHizmetler.length > 0 && selectedHizmetler.size < availableHizmetler.length) {
        if (row.completedHizmetTuru || row.matchStatus === 'ONLY_COMPLETED') {
          const h = normalize(row.completedHizmetTuru) || '(Belirtilmemiş)';
          if (!selectedHizmetler.has(h)) return false;
        }
      }

      // Durumu filter
      if (availableStatuses.length > 0 && selectedStatuses.size < availableStatuses.length) {
        if (row.completedDurumu || row.matchStatus === 'ONLY_COMPLETED') {
          const s = normalize(row.completedDurumu) || '(Belirtilmemiş)';
          if (!selectedStatuses.has(s)) return false;
        }
      }

      // Amirlik filter
      if (availableAmirlikler.length > 0 && selectedAmirlikler.size < availableAmirlikler.length) {
        const cAmirlik = normalize(row.completedAmirlik);
        const pAmirlik = normalize(row.pendingAmirlik);
        const matchesAmirlik = (cAmirlik && selectedAmirlikler.has(cAmirlik)) || (pAmirlik && selectedAmirlikler.has(pAmirlik));
        if (!matchesAmirlik) return false;
      }

      // Text search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesH = (row.hizmetNo || '').toLowerCase().includes(q);
        const matchesTeam = (row.ekipAdi || '').toLowerCase().includes(q) || 
                            (row.pendingTeam || '').toLowerCase().includes(q) || 
                            (row.completedTeam || '').toLowerCase().includes(q);
        const matchesPId = (row.pendingTaskId || '').toLowerCase().includes(q);
        const matchesCId = (row.completedIsemriId || '').toLowerCase().includes(q);
        const matchesAddr = (row.pendingAddress || '').toLowerCase().includes(q) || (row.completedLokasyon || '').toLowerCase().includes(q);
        const matchesType = (row.pendingTaskType || '').toLowerCase().includes(q) || (row.completedIsemriTipi || '').toLowerCase().includes(q);
        const matchesHizmet = (row.completedHizmetTuru || '').toLowerCase().includes(q);
        if (!matchesH && !matchesTeam && !matchesPId && !matchesCId && !matchesAddr && !matchesType && !matchesHizmet) {
          return false;
        }
      }

      return true;
    });
  }, [
    comparisonRows, 
    selectedTeams, 
    availableTeams, 
    statusFilter, 
    selectedTypes, 
    availableTypes, 
    selectedHizmetler, 
    availableHizmetler, 
    selectedStatuses, 
    availableStatuses, 
    selectedAmirlikler, 
    availableAmirlikler, 
    searchTerm
  ]);

  // 5. Sorted Rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const valA = (a[sortField] || '').toString();
      const valB = (b[sortField] || '').toString();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortAsc]);

  const handleSort = (field: keyof ComparisonRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // 6. Hizmet No Grouping: Group multiple records with SAME HizmetNo under one roof
  const { hizmetGroups, duplicateGroupCount, totalItemCount } = useMemo(() => {
    const map = new Map<string, ComparisonRow[]>();
    const order: string[] = [];

    sortedRows.forEach(row => {
      const key = row.hizmetNo ? row.hizmetNo.trim() : `unspecified_${row.key}`;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(row);
    });

    let dupCount = 0;
    const groups = order.map(key => {
      const rows = map.get(key)!;
      const isGroup = rows.length > 1 && !key.startsWith('unspecified_');
      if (isGroup) {
        dupCount++;
      }
      return {
        key,
        hizmetNo: key.startsWith('unspecified_') ? '' : key,
        rows,
        isGroup
      };
    });

    return {
      hizmetGroups: groups,
      duplicateGroupCount: dupCount,
      totalItemCount: sortedRows.length
    };
  }, [sortedRows]);

  // Dynamic visible row count: Collapsed group = 1 row; Expanded group = all child rows
  const visibleRowCount = useMemo(() => {
    let count = 0;
    hizmetGroups.forEach(g => {
      if (g.isGroup) {
        if (expandedHizmetler.has(g.hizmetNo)) {
          count += g.rows.length;
        } else {
          count += 1;
        }
      } else {
        count += g.rows.length;
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

  const hasAnyFilter = 
    searchTerm.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    (availableTeams.length > 0 && selectedTeams.size < availableTeams.length) ||
    (availableTypes.length > 0 && selectedTypes.size < availableTypes.length) ||
    (availableHizmetler.length > 0 && selectedHizmetler.size < availableHizmetler.length) ||
    (availableStatuses.length > 0 && selectedStatuses.size < availableStatuses.length) ||
    (availableAmirlikler.length > 0 && selectedAmirlikler.size < availableAmirlikler.length);

  // 7. Excel Export
  const handleExportExcel = () => {
    const exportColumns = [
      { key: 'hizmetNo', header: 'Hizmet No', width: 16 },
      { key: 'ekipAdi', header: 'Saha Ekibi', width: 22 },
      { key: 'statusLabel', header: 'Mutabakat Durumu', width: 34 },
      { key: 'completedTamamlanmaZamani', header: 'Tamamlanma Zamanı (Önemli)', width: 22 },
      { key: 'completedBildirimZamani', header: 'Bildirim Zamanı (Önemli)', width: 22 },
      { key: 'completedAtanmaZamani', header: 'Ekibe Atanma Zamanı (Önemli)', width: 22 },
      { key: 'pendingTaskId', header: 'Bekleyen İş Emri No', width: 20 },
      { key: 'pendingTaskType', header: 'Bekleyen İş Tipi', width: 20 },
      { key: 'completedIsemriId', header: 'Yapılan İşemri Id', width: 22 },
      { key: 'completedIsemriTipi', header: 'Yapılan İşemri Tipi', width: 22 },
      { key: 'completedHizmetTuru', header: 'Hizmet Türü', width: 18 },
      { key: 'completedDurumu', header: 'Saha Durumu', width: 16 },
      { key: 'pendingAddress', header: 'Bekleyen Adres / Santral', width: 30 },
      { key: 'completedLokasyon', header: 'Yapılan Lokasyon', width: 30 }
    ];

    exportToExcel({
      filename: `HizmetNo_Bekleyen_Yapilan_Karsilastirma_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Hizmet Karşılaştırma',
      data: sortedRows,
      columns: exportColumns
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* 1. Header KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 }}>
        <div className="panel" style={{ padding: '8px 12px', background: '#0d131f', borderLeft: '3px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>TOPLAM BEKLEYEN İŞLER</span>
            <Clock size={15} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            {stats.totalPending}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Aktif açık iş emri havuzu</div>
        </div>

        <div className="panel" style={{ padding: '8px 12px', background: '#0d131f', borderLeft: '3px solid #16a34a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>TOPLAM YAPILAN İŞLER</span>
            <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', marginTop: 2 }}>
            {stats.totalCompleted}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Saha tamamlanma raporu</div>
        </div>

        <div className="panel" style={{ padding: '8px 12px', background: '#0d131f', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>HİZMET NO İLE EŞLEŞEN</span>
            <GitCompare size={15} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
            {stats.matchedCount} Kayıt
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Hem yapılan hem bekleyen listesinde</div>
        </div>

        <div className="panel" style={{ padding: '8px 12px', background: '#0d131f', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>SADECE BEKLEYENLER</span>
            <AlertCircle size={15} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', marginTop: 2 }}>
            {stats.onlyPendingCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Sahada henüz tamamlanmamış</div>
        </div>
      </div>

      {/* 2. Team Performance Breakdown Summary */}
      <div className="panel" style={{ padding: '6px 10px', background: '#0d131f' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart2 size={13} style={{ color: '#38bdf8' }} /> Ekip Bazlı Bekleyen / Yapılan / Eşleşen Dağılımı
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {teamBreakdown.length} Saha Ekibi
          </span>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #1f293d' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ background: '#111827', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Saha Ekibi</th>
                <th style={{ padding: '4px 8px', textAlign: 'center' }}>Bekleyen İş Sayısı</th>
                <th style={{ padding: '4px 8px', textAlign: 'center' }}>Yapılan İş Sayısı</th>
                <th style={{ padding: '4px 8px', textAlign: 'center', color: '#38bdf8' }}>Eşleşen Hizmet Sayısı</th>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Tamamlama Oranı</th>
                <th style={{ padding: '4px 8px', textAlign: 'center' }}>Ekip Filtrele</th>
              </tr>
            </thead>
            <tbody>
              {teamBreakdown.map(t => {
                const isOnlyThisTeam = selectedTeams.size === 1 && selectedTeams.has(t.ekipAdi);
                const isSelectedInMulti = selectedTeams.has(t.ekipAdi);

                return (
                  <tr 
                    key={t.ekipAdi}
                    style={{ 
                      borderBottom: '1px solid #1f293d',
                      background: isOnlyThisTeam 
                        ? 'rgba(2, 132, 199, 0.18)' 
                        : (isSelectedInMulti ? 'transparent' : 'rgba(0,0,0,0.3)'),
                      borderLeft: isOnlyThisTeam ? '3px solid #0284c7' : 'none',
                      opacity: isSelectedInMulti ? 1 : 0.5
                    }}
                  >
                    <td style={{ padding: '4px 8px', fontWeight: 700, color: isOnlyThisTeam ? '#38bdf8' : '#f8fafc' }}>
                      {t.ekipAdi}
                      {isOnlyThisTeam && (
                        <span style={{ marginLeft: 6, fontSize: '0.62rem', background: '#0284c7', color: '#ffffff', padding: '1px 5px', fontWeight: 700 }}>
                          SEÇİLİ
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', color: '#fbbf24', fontWeight: 600 }}>
                      {t.pendingCount}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', color: '#4ade80', fontWeight: 600 }}>
                      {t.completedCount}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', color: '#38bdf8', fontWeight: 700 }}>
                      {t.matchedCount}
                    </td>
                    <td style={{ padding: '4px 8px', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: '#1e293b' }}>
                          <div 
                            style={{ 
                              width: `${Math.min(t.completionRate, 100)}%`, 
                              height: '100%', 
                              background: t.completionRate > 50 ? '#16a34a' : (t.completionRate > 20 ? '#0284c7' : '#d97706') 
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, width: 32 }}>%{t.completionRate}</span>
                      </div>
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectOnlyTeam(t.ekipAdi)}
                        className={isOnlyThisTeam ? 'btn btn-primary' : 'btn btn-outline'}
                        style={{ 
                          padding: '2px 8px', 
                          fontSize: '0.65rem',
                          background: isOnlyThisTeam ? '#0284c7' : undefined,
                          borderColor: isOnlyThisTeam ? '#38bdf8' : undefined,
                          color: isOnlyThisTeam ? '#ffffff' : undefined,
                          fontWeight: isOnlyThisTeam ? 700 : 500
                        }}
                        title={isOnlyThisTeam ? 'Filtreyi kaldır ve tüm ekipleri göster' : `Sadece ${t.ekipAdi} ekibini ve alt tablosunu görüntüle`}
                      >
                        {isOnlyThisTeam ? '✓ Seçili (Filtreyi Kaldır)' : 'Sadece Bu Ekip'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Filter Toolbar with MultiSelect Checklists, Grouping Controls & Excel Export */}
      <div className="panel" style={{ padding: '8px 10px', background: '#0d131f', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Row 1: Search, Status Chips, Group Controls, Reset, Excel Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: 210 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Hizmet No / Ekip / İşemri Id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 26, paddingTop: 4, paddingBottom: 4, fontSize: '0.78rem' }}
              />
            </div>

            {/* Quick Status Chips */}
            <div style={{ display: 'flex', border: '1px solid #334155' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="btn"
                style={{
                  background: statusFilter === 'ALL' ? '#1e293b' : 'transparent',
                  color: statusFilter === 'ALL' ? '#f8fafc' : '#94a3b8',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  border: 'none',
                  fontWeight: statusFilter === 'ALL' ? 700 : 500
                }}
              >
                Tümü ({stats.totalRows})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('MATCHED')}
                className="btn"
                style={{
                  background: statusFilter === 'MATCHED' ? '#082f49' : 'transparent',
                  color: statusFilter === 'MATCHED' ? '#38bdf8' : '#94a3b8',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  border: 'none',
                  borderLeft: '1px solid #334155',
                  fontWeight: statusFilter === 'MATCHED' ? 700 : 500
                }}
              >
                ✅ Eşleşenler ({stats.matchedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ONLY_PENDING')}
                className="btn"
                style={{
                  background: statusFilter === 'ONLY_PENDING' ? '#281f11' : 'transparent',
                  color: statusFilter === 'ONLY_PENDING' ? '#fbbf24' : '#94a3b8',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  border: 'none',
                  borderLeft: '1px solid #334155',
                  fontWeight: statusFilter === 'ONLY_PENDING' ? 700 : 500
                }}
              >
                ⏳ Sadece Bekleyen ({stats.onlyPendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ONLY_COMPLETED')}
                className="btn"
                style={{
                  background: statusFilter === 'ONLY_COMPLETED' ? '#14532d' : 'transparent',
                  color: statusFilter === 'ONLY_COMPLETED' ? '#4ade80' : '#94a3b8',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  border: 'none',
                  borderLeft: '1px solid #334155',
                  fontWeight: statusFilter === 'ONLY_COMPLETED' ? 700 : 500
                }}
              >
                🏁 Sadece Yapılan ({stats.onlyCompletedCount})
              </button>
            </div>

            {/* Hizmet No Grubu Aç / Kapat Butonları */}
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
                  title="Aynı Hizmet No'ya ait tüm grupları kapat (tek satırda özetle)"
                >
                  <FolderMinus size={11} style={{ color: '#94a3b8' }} /> Tümünü Kapat
                </button>
              </div>
            )}

            {/* Reset Filters */}
            {hasAnyFilter && (
              <button
                type="button"
                onClick={onResetFilters}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Tüm Filtreleri Sıfırla"
              >
                <RotateCcw size={11} /> Sıfırla
              </button>
            )}
          </div>

          {/* Excel Export Button & Dynamic Count Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={handleExportExcel}
              className="btn btn-primary"
              style={{ padding: '4px 12px', fontSize: '0.78rem', background: '#16a34a', borderColor: '#16a34a' }}
              title="Görünen filtrelenmiş verileri profesyonel Excel (.xlsx) formatında indir"
            >
              <FileSpreadsheet size={14} /> Karşılaştırmayı Excele Aktar (.xlsx)
            </button>

            <span 
              style={{ 
                fontSize: '0.75rem', 
                background: '#0b0f19', 
                color: '#38bdf8', 
                padding: '3px 8px', 
                fontWeight: 700, 
                border: '1px solid #1f293d' 
              }}
              title={`Açık olduğunda toplam ${totalItemCount} iş emri, kapalı olduğunda ${visibleRowCount} kayıt listelenir.`}
            >
              {visibleRowCount} Kayıt Gösteriliyor ({totalItemCount} Toplam İş Emri)
            </span>
          </div>
        </div>

        {/* Row 2: Shared Multi-Select Checklist Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderTop: '1px solid #1f293d', paddingTop: 6 }}>
          {/* Ekip Filter - MultiSelect Checklist */}
          {availableTeams.length > 0 && (
            <MultiSelectFilter
              title="Saha Ekibi"
              icon={<Users size={12} style={{ color: '#38bdf8' }} />}
              options={availableTeams.map(name => {
                const b = teamBreakdown.find(tb => tb.ekipAdi === name);
                return {
                  value: name,
                  label: name,
                  count: b ? (b.pendingCount + b.completedCount) : 0
                };
              })}
              selectedValues={selectedTeams}
              onChange={setSelectedTeams}
              placeholder="Ekip ara..."
            />
          )}

          {/* İş Emri Tipi Filter - MultiSelect Checklist */}
          {availableTypes.length > 0 && (
            <MultiSelectFilter
              title="İş Emri Tipi"
              options={availableTypes.map(t => ({
                value: t,
                label: t
              }))}
              selectedValues={selectedTypes}
              onChange={setSelectedTypes}
              placeholder="İş tipi ara..."
            />
          )}

          {/* Hizmet Türü Filter - MultiSelect Checklist */}
          {availableHizmetler.length > 0 && (
            <MultiSelectFilter
              title="Hizmet Türü"
              options={availableHizmetler.map(h => ({
                value: h,
                label: h
              }))}
              selectedValues={selectedHizmetler}
              onChange={setSelectedHizmetler}
              placeholder="Hizmet ara..."
            />
          )}

          {/* Durumu Filter - MultiSelect Checklist */}
          {availableStatuses.length > 0 && (
            <MultiSelectFilter
              title="Durumu"
              options={availableStatuses.map(s => ({
                value: s,
                label: s
              }))}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Durum ara..."
            />
          )}

          {/* Amirlik Filter - MultiSelect Checklist */}
          {availableAmirlikler.length > 0 && (
            <MultiSelectFilter
              title="Müdürlük - Amirlik"
              icon={<Building size={12} style={{ color: '#38bdf8' }} />}
              options={availableAmirlikler.map(a => ({
                value: a,
                label: a
              }))}
              selectedValues={selectedAmirlikler}
              onChange={setSelectedAmirlikler}
              placeholder="Amirlik ara..."
            />
          )}
        </div>
      </div>

      {/* Active Single Team Banner (When "Sadece Bu Ekip" is active) */}
      {selectedTeams.size === 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: '#082f49',
          border: '1px solid #0284c7',
          color: '#38bdf8',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} />
            <span>
              Filtrelenen Saha Ekibi: <strong>{Array.from(selectedTeams)[0]}</strong>
              <span style={{ fontWeight: 400, marginLeft: 8, color: '#94a3b8' }}>
                (Alt tabloda bu ekibe ait {visibleRowCount} kayıt listeleniyor - Toplam {totalItemCount} iş emri)
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTeams(new Set(availableTeams))}
            className="btn"
            style={{
              padding: '2px 8px',
              fontSize: '0.7rem',
              background: '#0369a1',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ✕ Tüm Ekipleri Göster
          </button>
        </div>
      )}

      {/* 4. Detailed Side-by-Side Reconciliation Table ("Alt Kısımdaki Listeleme") */}
      <div ref={tableRef} className="panel" style={{ overflowX: 'auto', border: '1px solid #1f293d' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
          <thead>
            <tr style={{ background: '#111827', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th 
                onClick={() => handleSort('hizmetNo')} 
                style={{ padding: '6px 8px', cursor: 'pointer', color: '#38bdf8', fontWeight: 700 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Hizmet No</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('ekipAdi')} 
                style={{ padding: '6px 8px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Saha Ekibi</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>
                Mutabakat Durumu
              </th>
              
              {/* 3 CRUCIAL DATES HIGHLIGHTED */}
              <th 
                onClick={() => handleSort('completedTamamlanmaZamani')}
                style={{ padding: '6px 8px', cursor: 'pointer', background: 'rgba(74, 222, 128, 0.08)', color: '#4ade80', fontWeight: 700 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} />
                  <span>Tamamlanma Zamanı</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('completedBildirimZamani')}
                style={{ padding: '6px 8px', cursor: 'pointer', background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8', fontWeight: 700 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Bildirim Zamanı</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('completedAtanmaZamani')}
                style={{ padding: '6px 8px', cursor: 'pointer', background: 'rgba(251, 191, 36, 0.08)', color: '#fbbf24', fontWeight: 700 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Ekibe Atanma Zamanı</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>

              {/* Work Order Details */}
              <th style={{ padding: '6px 8px' }}>Bekleyen İş Emri</th>
              <th style={{ padding: '6px 8px' }}>Yapılan İş Emri</th>
              <th style={{ padding: '6px 8px' }}>Hizmet Türü</th>
              <th style={{ padding: '6px 8px' }}>Adres / Lokasyon</th>
            </tr>
          </thead>
          <tbody>
            {hizmetGroups.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                  Filtrelere uygun karşılaştırma kaydı bulunamadı.
                </td>
              </tr>
            ) : (
              hizmetGroups.map(group => {
                // CASE 1: Single Item under this HizmetNo
                if (!group.isGroup) {
                  const row = group.rows[0];
                  const isMatched = row.matchStatus === 'MATCHED';
                  const isOnlyPending = row.matchStatus === 'ONLY_PENDING';
                  const isOnlyCompleted = row.matchStatus === 'ONLY_COMPLETED';

                  return (
                    <tr 
                      key={row.key}
                      style={{
                        borderBottom: '1px solid #1f293d',
                        background: isMatched ? 'rgba(56, 189, 248, 0.03)' : '#0d131f'
                      }}
                    >
                      {/* Hizmet No */}
                      <td style={{ padding: '5px 8px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                        {row.hizmetNo || '-'}
                      </td>

                      {/* Saha Ekibi - Shows both if different */}
                      <td style={{ padding: '5px 8px', fontWeight: 600, color: '#f8fafc' }}>
                        {isMatched && row.completedTeam && row.pendingTeam && row.completedTeam !== row.pendingTeam ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ color: '#4ade80', fontWeight: 700 }} title="İşi Yapan Ekip">
                              🏁 {row.completedTeam}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.66rem' }} title="Bekleyen Atanmış Ekip">
                              ⏳ Atanan: {row.pendingTeam}
                            </span>
                          </div>
                        ) : (
                          <span>{row.completedTeam || row.pendingTeam || row.ekipAdi}</span>
                        )}
                      </td>

                      {/* Match Status Badge */}
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        {isMatched && (
                          <span style={{ 
                            padding: '2px 6px', 
                            background: '#082f49', 
                            color: '#38bdf8', 
                            border: '1px solid #0284c7', 
                            fontWeight: 700,
                            fontSize: '0.65rem'
                          }}>
                            Eşleşti (Sahada Tamamlandı)
                          </span>
                        )}
                        {isOnlyPending && (
                          <span style={{ 
                            padding: '2px 6px', 
                            background: '#281f11', 
                            color: '#fbbf24', 
                            border: '1px solid #d97706', 
                            fontWeight: 600,
                            fontSize: '0.65rem'
                          }}>
                            Bekleyen Havuzda
                          </span>
                        )}
                        {isOnlyCompleted && (
                          <span style={{ 
                            padding: '2px 6px', 
                            background: '#14532d', 
                            color: '#4ade80', 
                            border: '1px solid #16a34a', 
                            fontWeight: 600,
                            fontSize: '0.65rem'
                          }}>
                            Sadece Yapılan
                          </span>
                        )}
                      </td>

                      {/* 3 CRUCIAL DATES */}
                      <td style={{ padding: '5px 8px', color: row.completedTamamlanmaZamani ? '#4ade80' : '#64748b', fontWeight: row.completedTamamlanmaZamani ? 700 : 400 }}>
                        {row.completedTamamlanmaZamani || '-'}
                      </td>
                      <td style={{ padding: '5px 8px', color: row.completedBildirimZamani ? '#38bdf8' : '#64748b' }}>
                        {row.completedBildirimZamani || (row.pendingStartTime ? row.pendingStartTime.slice(0, 16) : '-')}
                      </td>
                      <td style={{ padding: '5px 8px', color: row.completedAtanmaZamani ? '#fbbf24' : '#64748b' }}>
                        {row.completedAtanmaZamani || '-'}
                      </td>

                      {/* Work Order Details */}
                      <td style={{ padding: '5px 8px', color: row.pendingTaskId ? '#f8fafc' : '#64748b' }}>
                        {row.pendingTaskId ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>#{row.pendingTaskId}</div>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{row.pendingTaskType}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '5px 8px', color: row.completedIsemriId ? '#f8fafc' : '#64748b' }}>
                        {row.completedIsemriId ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>{row.completedIsemriId}</div>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{row.completedIsemriTipi}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '5px 8px', color: '#94a3b8' }}>
                        {row.completedHizmetTuru || '-'}
                      </td>
                      <td style={{ padding: '5px 8px', color: '#cbd5e1', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.pendingAddress || row.completedLokasyon || ''}>
                        {row.pendingAddress || row.completedLokasyon || '-'}
                      </td>
                    </tr>
                  );
                }

                // CASE 2: Multiple Items with the SAME HizmetNo (Grouped under same roof!)
                const isExpanded = expandedHizmetler.has(group.hizmetNo);
                const firstRow = group.rows[0];
                const teamName = firstRow.completedTeam || firstRow.pendingTeam || firstRow.ekipAdi;
                const uniqueTypes = Array.from(new Set(group.rows.map(r => r.completedIsemriTipi || r.pendingTaskType).filter(Boolean))).join(', ');
                const uniqueHizmetler = Array.from(new Set(group.rows.map(r => r.completedHizmetTuru).filter(Boolean))).join(', ');
                const latestCompleted = group.rows.find(r => r.completedTamamlanmaZamani)?.completedTamamlanmaZamani || '-';
                const firstBildirim = group.rows.find(r => r.completedBildirimZamani)?.completedBildirimZamani || '-';
                const firstAtanma = group.rows.find(r => r.completedAtanmaZamani)?.completedAtanmaZamani || '-';

                return (
                  <React.Fragment key={`group_frag_${group.hizmetNo}`}>
                    {/* MASTER GROUP ROW (Açılır / Kapanır Çatı Satırı) */}
                    <tr
                      onClick={() => toggleGroup(group.hizmetNo)}
                      style={{
                        borderBottom: '1px solid #1f293d',
                        background: isExpanded ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.16)',
                        borderLeft: '4px solid #38bdf8',
                        cursor: 'pointer',
                        transition: 'none'
                      }}
                      title="Aynı Hizmet No'ya ait işemirlerini açmak / kapatmak için tıklayın"
                    >
                      {/* Hizmet No + Accordion Icon + Count Badge */}
                      <td style={{ padding: '6px 8px', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isExpanded ? (
                            <ChevronDown size={14} style={{ color: '#38bdf8' }} />
                          ) : (
                            <ChevronRight size={14} style={{ color: '#38bdf8' }} />
                          )}
                          <span style={{ textDecoration: 'underline', textDecorationThickness: '1px' }}>
                            {group.hizmetNo}
                          </span>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            background: isExpanded ? '#0369a1' : '#0284c7', 
                            color: '#ffffff', 
                            padding: '1px 6px', 
                            fontWeight: 700 
                          }}>
                            {group.rows.length} İş Emri {isExpanded ? '▼ Açık' : '▶ Kapalı'}
                          </span>
                        </div>
                      </td>

                      {/* Saha Ekibi */}
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#f8fafc' }}>
                        {teamName}
                      </td>

                      {/* Group Mutabakat Durumu */}
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          background: '#082f49',
                          color: '#38bdf8',
                          border: '1px solid #0284c7',
                          fontWeight: 700,
                          fontSize: '0.65rem'
                        }}>
                          Grup: {group.rows.length} İş Emri
                        </span>
                      </td>

                      {/* 3 CRUCIAL DATES SUMMARY */}
                      <td style={{ padding: '6px 8px', color: '#4ade80', fontWeight: 700 }}>
                        {latestCompleted}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#38bdf8' }}>
                        {firstBildirim}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#fbbf24' }}>
                        {firstAtanma}
                      </td>

                      {/* Work Order Details Summary */}
                      <td style={{ padding: '6px 8px', color: '#94a3b8' }}>
                        {group.rows.filter(r => r.pendingTaskId).length} Bekleyen Görev
                      </td>
                      <td style={{ padding: '6px 8px', color: '#f8fafc', fontWeight: 600 }}>
                        {uniqueTypes}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#94a3b8' }}>
                        {uniqueHizmetler || '-'}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#cbd5e1', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {firstRow.pendingAddress || firstRow.completedLokasyon || '-'}
                      </td>
                    </tr>

                    {/* CHILD ROWS (Açıldığında listelenen detay işemirleri) */}
                    {isExpanded && group.rows.map((row, idx) => {
                      const isMatched = row.matchStatus === 'MATCHED';
                      const isOnlyPending = row.matchStatus === 'ONLY_PENDING';
                      const isOnlyCompleted = row.matchStatus === 'ONLY_COMPLETED';

                      return (
                        <tr 
                          key={row.key || `${group.hizmetNo}_child_${idx}`}
                          style={{
                            borderBottom: '1px solid #1f293d',
                            background: idx % 2 === 0 ? '#0b111e' : '#0e1626',
                            borderLeft: '4px solid #1e3a5f'
                          }}
                        >
                          {/* Indented Child Indicator */}
                          <td style={{ padding: '4px 8px 4px 26px', color: '#94a3b8', fontFamily: 'monospace' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: '#38bdf8', fontWeight: 700 }}>↳</span>
                              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>İş Emri #{idx + 1}</span>
                            </div>
                          </td>

                          {/* Saha Ekibi */}
                          <td style={{ padding: '4px 8px', color: '#e2e8f0', fontSize: '0.70rem' }}>
                            {row.completedTeam || row.pendingTeam || row.ekipAdi}
                          </td>

                          {/* Child Match Status */}
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            {isMatched && (
                              <span style={{ padding: '1px 5px', background: '#082f49', color: '#38bdf8', fontSize: '0.62rem', fontWeight: 700 }}>
                                Eşleşti
                              </span>
                            )}
                            {isOnlyPending && (
                              <span style={{ padding: '1px 5px', background: '#281f11', color: '#fbbf24', fontSize: '0.62rem', fontWeight: 600 }}>
                                Bekleyen
                              </span>
                            )}
                            {isOnlyCompleted && (
                              <span style={{ padding: '1px 5px', background: '#14532d', color: '#4ade80', fontSize: '0.62rem', fontWeight: 600 }}>
                                Yapılan
                              </span>
                            )}
                          </td>

                          {/* 3 CRUCIAL DATES */}
                          <td style={{ padding: '4px 8px', color: row.completedTamamlanmaZamani ? '#4ade80' : '#64748b', fontWeight: row.completedTamamlanmaZamani ? 700 : 400 }}>
                            {row.completedTamamlanmaZamani || '-'}
                          </td>
                          <td style={{ padding: '4px 8px', color: row.completedBildirimZamani ? '#38bdf8' : '#64748b' }}>
                            {row.completedBildirimZamani || (row.pendingStartTime ? row.pendingStartTime.slice(0, 16) : '-')}
                          </td>
                          <td style={{ padding: '4px 8px', color: row.completedAtanmaZamani ? '#fbbf24' : '#64748b' }}>
                            {row.completedAtanmaZamani || '-'}
                          </td>

                          {/* Work Order Details */}
                          <td style={{ padding: '4px 8px', color: row.pendingTaskId ? '#f8fafc' : '#64748b' }}>
                            {row.pendingTaskId ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>#{row.pendingTaskId}</span>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: 4 }}>{row.pendingTaskType}</span>
                              </div>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '4px 8px', color: row.completedIsemriId ? '#f8fafc' : '#64748b' }}>
                            {row.completedIsemriId ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>{row.completedIsemriId}</span>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: 4 }}>{row.completedIsemriTipi}</span>
                              </div>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '4px 8px', color: '#94a3b8' }}>
                            {row.completedHizmetTuru || '-'}
                          </td>
                          <td style={{ padding: '4px 8px', color: '#cbd5e1', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.pendingAddress || row.completedLokasyon || '-'}
                          </td>
                        </tr>
                      );
                    })}
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
