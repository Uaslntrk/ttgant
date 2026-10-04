import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  AlertTriangle, 
  Clock, 
  Calendar,
  Route,
  Edit3,
  Building,
  MapPin,
  Lock,
  Download,
  Users,
  RotateCcw
} from 'lucide-react';
import { Task, Team } from '../types';
import { MultiSelectFilter } from './MultiSelectFilter';
import { exportToExcel } from '../utils/excelExporter';

interface TaskTableProps {
  tasks: Task[];
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onEditTask: (task: Task) => void;
  onNavigateToMapWithTask: (task: Task) => void;
}

type SortField = 'TaskId' | 'TaskType' | 'TeamName' | 'Amirlik' | 'StartTime' | 'EndTime' | 'DurationDays' | 'RemainingDays';

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  teams,
  selectedTeamId,
  onSelectTeam,
  onEditTask,
  onNavigateToMapWithTask
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('RemainingDays');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const now = new Date();

  // Extract unique categories & teams
  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.TaskType) set.add(t.TaskType.trim()); });
    return Array.from(set).sort();
  }, [tasks]);

  const teamNames = useMemo(() => {
    const set = new Set<string>();
    teams.forEach(t => { if (t.TeamName) set.add(t.TeamName.trim()); });
    tasks.forEach(t => { if (t.TeamName) set.add(t.TeamName.trim()); });
    return Array.from(set).sort();
  }, [teams, tasks]);

  // Multi-Select Checklist Filters (ALL CHECKED BY DEFAULT)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(() => new Set());

  const categoriesInitRef = useRef<boolean>(false);
  const teamsInitRef = useRef<boolean>(false);

  // Initialize selections once to include all options
  useEffect(() => {
    if (categories.length > 0 && !categoriesInitRef.current) {
      setSelectedCategories(new Set(categories));
      categoriesInitRef.current = true;
    }
  }, [categories]);

  useEffect(() => {
    if (teamNames.length > 0 && !teamsInitRef.current) {
      setSelectedTeams(new Set(teamNames));
      teamsInitRef.current = true;
    }
  }, [teamNames]);

  // Enhance tasks with calculated RemainingDays
  const enhancedTasks = useMemo(() => {
    return tasks.map(task => {
      const end = new Date(task.EndTime);
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...task,
        remainingDays: diffDays,
        isOverdue: diffDays < 0 && task.Status !== 'Completed',
        isDueSoon: diffDays >= 0 && diffDays <= (task.NotificationBeforeDays || 2) && task.Status !== 'Completed'
      };
    });
  }, [tasks]);

  // Filter tasks (items unchecked by user are excluded)
  const filteredTasks = useMemo(() => {
    return enhancedTasks.filter(task => {
      // Category filter (checklist)
      const tCat = (task.TaskType || '').trim();
      if (categories.length > 0 && !selectedCategories.has(tCat)) return false;

      // Team filter (checklist)
      const tTeam = (task.TeamName || '').trim();
      if (teamNames.length > 0 && !selectedTeams.has(tTeam)) return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesId = (task.HizmetNo || task.TaskId).toLowerCase().includes(term);
        const matchesType = (task.TaskType || '').toLowerCase().includes(term);
        const matchesTeam = (task.TeamName || '').toLowerCase().includes(term);
        const matchesAddr = (task.HizmetAdresi || '').toLowerCase().includes(term);
        const matchesSantral = (task.Santral || '').toLowerCase().includes(term);
        if (!matchesId && !matchesType && !matchesTeam && !matchesAddr && !matchesSantral) return false;
      }
      return true;
    });
  }, [enhancedTasks, categories, selectedCategories, teamNames, selectedTeams, searchTerm]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a];
      let valB: any = b[sortField as keyof typeof b];

      if (sortField === 'RemainingDays') {
        valA = a.remainingDays;
        valB = b.remainingDays;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredTasks, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategories(new Set(categories));
    setSelectedTeams(new Set(teamNames));
  };

  const hasFilters = searchTerm !== '' || 
    (categories.length > 0 && selectedCategories.size < categories.length) ||
    (teamNames.length > 0 && selectedTeams.size < teamNames.length);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportColumns = [
      { key: 'HizmetNo', header: 'Hizmet No', width: 16 },
      { key: 'TaskId', header: 'İş Emri No', width: 16 },
      { key: 'TaskType', header: 'İş Emri Tipi', width: 22 },
      { key: 'TeamName', header: 'Saha Ekibi', width: 22 },
      { key: 'Amirlik', header: 'Müdürlük / Amirlik', width: 20 },
      { key: 'Santral', header: 'Santral', width: 16 },
      { key: 'StartTime', header: 'Başlangıç Tarihi', width: 20 },
      { key: 'EndTime', header: 'Bitiş Tarihi', width: 20 },
      { key: 'remainingDays', header: 'Kalan Gün', width: 12 },
      { key: 'Status', header: 'Durumu', width: 14 },
      { key: 'HizmetAdresi', header: 'Hizmet Adresi', width: 35 }
    ];

    exportToExcel({
      filename: `Bekleyen_Isler_Filtrelenmis_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Bekleyen İşler',
      data: sortedTasks,
      columns: exportColumns
    });
  };

  return (
    <div className="panel" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Search and Filters Header - Compact & Multi-Select Checklist */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="İş emri, adres veya ekip ara..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 28, paddingTop: 4, paddingBottom: 4, fontSize: '0.78rem' }}
            />
          </div>

          {/* Category Filter - MultiSelect Checklist (All checked by default) */}
          {categories.length > 0 && (
            <MultiSelectFilter
              title="İş Tipi"
              options={categories.map(c => ({
                value: c,
                label: c,
                count: tasks.filter(t => t.TaskType === c).length
              }))}
              selectedValues={selectedCategories}
              onChange={setSelectedCategories}
              placeholder="İş tipi ara..."
            />
          )}

          {/* Team Filter - MultiSelect Checklist (All checked by default) */}
          {teamNames.length > 0 && (
            <MultiSelectFilter
              title="Saha Ekibi"
              icon={<Users size={12} style={{ color: '#38bdf8' }} />}
              options={teamNames.map(t => ({
                value: t,
                label: t,
                count: tasks.filter(task => task.TeamName === t).length
              }))}
              selectedValues={selectedTeams}
              onChange={setSelectedTeams}
              placeholder="Ekip ara..."
            />
          )}

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

        {/* Counter Info, Read-Only Badge, and Excel Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleExportExcel}
            className="btn btn-primary"
            style={{ padding: '4px 10px', fontSize: '0.78rem', background: '#16a34a', borderColor: '#16a34a' }}
            title="Görünen filtrelenmiş verileri profesyonel Excel (.xlsx) formatında indir"
          >
            <Download size={13} /> Excele Aktar (.xlsx)
          </button>

          <span style={{
            fontSize: '0.7rem',
            background: '#281f11',
            color: '#f59e0b',
            padding: '2px 6px',
            border: '1px solid #d97706',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Lock size={11} /> Excel Verileri Kilitli
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Toplam <b>{sortedTasks.length}</b> iş emri
          </span>
        </div>
      </div>

      {/* Tasks Table - High Density */}
      <div style={{ overflowX: 'auto', border: '1px solid #1f293d' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: '#111827', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th onClick={() => handleSort('TaskId')} style={{ padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  İş Emri / Hzm No <ArrowUpDown size={11} />
                </div>
              </th>
              <th onClick={() => handleSort('TaskType')} style={{ padding: '6px 8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Kategori / Tür <ArrowUpDown size={11} />
                </div>
              </th>
              <th onClick={() => handleSort('TeamName')} style={{ padding: '6px 8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Saha Ekibi <ArrowUpDown size={11} />
                </div>
              </th>
              <th onClick={() => handleSort('Amirlik')} style={{ padding: '6px 8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Amirlik / Santral <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ padding: '6px 8px', minWidth: 180 }}>
                Hizmet Adresi
              </th>
              <th onClick={() => handleSort('StartTime')} style={{ padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Ekibe Atanma <ArrowUpDown size={11} />
                </div>
              </th>
              <th onClick={() => handleSort('EndTime')} style={{ padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Randevu / Bitiş <ArrowUpDown size={11} />
                </div>
              </th>
              <th onClick={() => handleSort('DurationDays')} style={{ padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Süre <ArrowUpDown size={11} />
                </div>
              </th>
              {/* Highlighted RemainingDays Column */}
              <th onClick={() => handleSort('RemainingDays')} style={{ padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap', background: '#1c1517' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f87171', fontWeight: 700 }}>
                  Kalan Süre <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                Uyarı
              </th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '20px 8px', textAlign: 'center', color: '#64748b' }}>
                  Kayıtlı iş emri bulunamadı.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task, idx) => {
                const isOverdue = task.isOverdue;
                const isDueSoon = task.isDueSoon;
                const isCompleted = task.Status === 'Completed';

                return (
                  <tr
                    key={task.TaskId}
                    style={{
                      borderBottom: '1px solid #1f293d',
                      background: isOverdue ? '#241013' : (idx % 2 === 0 ? '#0d131f' : '#111827')
                    }}
                  >
                    {/* TaskId / HizmetNo */}
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                      #{task.HizmetNo || task.TaskId}
                    </td>

                    {/* TaskType */}
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#f8fafc' }}>
                      {task.TaskType}
                    </td>

                    {/* Team */}
                    <td style={{ padding: '6px 8px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                      {task.TeamName ? (
                        <span style={{ fontWeight: 600 }}>
                          {task.TeamName}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontStyle: 'italic' }}>Atanmamış</span>
                      )}
                    </td>

                    {/* Amirlik / Santral */}
                    <td style={{ padding: '6px 8px', color: '#94a3b8', fontSize: '0.72rem' }}>
                      <div><b>{task.Santral || '-'}</b> {task.Amirlik ? `(${task.Amirlik})` : ''}</div>
                    </td>

                    {/* Hizmet Adresi & BBK */}
                    <td style={{ padding: '6px 8px', color: '#cbd5e1', fontSize: '0.72rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.HizmetAdresi || (task.BbkKodu ? `BBK: ${task.BbkKodu}` : '')}>
                      {task.BbkKodu && (
                        <span style={{
                          fontSize: '0.65rem',
                          background: '#008488',
                          color: 'white',
                          padding: '1px 5px',
                          borderRadius: 3,
                          marginRight: 6,
                          fontWeight: 700,
                          display: 'inline-block'
                        }}>
                          BBK: {task.BbkKodu}
                        </span>
                      )}
                      {task.HizmetAdresi ? (
                        <span>{task.HizmetAdresi}</span>
                      ) : (
                        <span style={{ color: '#eab308', fontStyle: 'italic' }}>Adres bekleniyor</span>
                      )}
                    </td>

                    {/* Dates */}
                    <td style={{ padding: '6px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {task.StartTime.slice(0, 10)}
                    </td>
                    <td style={{ padding: '6px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {task.EndTime.slice(0, 10)}
                    </td>

                    {/* DurationDays */}
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>
                      {task.DurationDays}g
                    </td>

                    {/* RemainingDays: Negatif ise kırmızı vurgulu */}
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', background: isOverdue ? '#3b1216' : undefined }}>
                      {isCompleted ? (
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>
                          Tamamlandı
                        </span>
                      ) : isOverdue ? (
                        <span style={{
                          padding: '1px 5px',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.72rem'
                        }}>
                          {task.remainingDays} gün (Gecikmiş!)
                        </span>
                      ) : isDueSoon ? (
                        <span style={{
                          padding: '1px 5px',
                          background: '#d97706',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.72rem'
                        }}>
                          {task.remainingDays} gün (Yaklaşan)
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>
                          +{task.remainingDays} gün
                        </span>
                      )}
                    </td>

                    {/* NotificationBeforeDays */}
                    <td style={{ padding: '6px 8px', color: '#94a3b8', textAlign: 'center' }}>
                      {task.NotificationBeforeDays || 2}g
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          onClick={() => onNavigateToMapWithTask(task)}
                          className="btn btn-secondary"
                          title="Haritada göster ve rota çiz"
                          style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#0284c7', borderColor: '#0284c7' }}
                        >
                          <Route size={12} />
                        </button>
                        <button
                          onClick={() => onEditTask(task)}
                          className="btn btn-secondary"
                          title="Süre ve uyarı parametrelerini düzenle"
                          style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
