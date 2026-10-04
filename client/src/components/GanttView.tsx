import React, { useState, useMemo } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, Search, Filter, Edit2, Users } from 'lucide-react';
import { Task, Team } from '../types';

interface GanttViewProps {
  tasks: Task[];
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onEditTask: (task: Task) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({
  tasks,
  teams,
  selectedTeamId,
  onSelectTeam,
  onEditTask
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter tasks based on selected team, search, and status
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedTeamId && task.TeamId !== selectedTeamId) return false;
      if (statusFilter !== 'ALL' && task.Status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesId = task.TaskId.toLowerCase().includes(term);
        const matchesType = task.TaskType.toLowerCase().includes(term);
        const matchesTeam = (task.TeamName || '').toLowerCase().includes(term);
        const matchesHzm = (task.HizmetNo || '').toLowerCase().includes(term);
        const matchesSantral = (task.Santral || '').toLowerCase().includes(term);
        const matchesAmirlik = (task.Amirlik || '').toLowerCase().includes(term);
        const matchesAdres = (task.HizmetAdresi || '').toLowerCase().includes(term);
        if (!matchesId && !matchesType && !matchesTeam && !matchesHzm && !matchesSantral && !matchesAmirlik && !matchesAdres) return false;
      }
      return true;
    });
  }, [tasks, selectedTeamId, statusFilter, searchTerm]);

  // Compute timeline boundaries
  const { startDate, endDate, totalDays, datesList } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 14 * 86400000),
        totalDays: 14,
        datesList: []
      };
    }

    let minTime = Infinity;
    let maxTime = -Infinity;

    tasks.forEach(t => {
      const s = new Date(t.StartTime).getTime();
      const e = new Date(t.EndTime).getTime();
      if (!isNaN(s) && s < minTime) minTime = s;
      if (!isNaN(e) && e > maxTime) maxTime = e;
    });

    const start = new Date(minTime - 2 * 86400000);
    start.setHours(0, 0, 0, 0);

    const end = new Date(maxTime + 3 * 86400000);
    end.setHours(0, 0, 0, 0);

    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 10);

    const list: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      list.push(d);
    }

    return {
      startDate: start,
      endDate: end,
      totalDays: days,
      datesList: list
    };
  }, [tasks]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Group tasks by Team
  const groupedTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      const key = task.TeamName || task.TeamId || 'Atanmamış';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [filteredTasks]);

  const cellWidth = 50;

  return (
    <div className="panel" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Controls Bar - Compact */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Görev veya tür ara..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 26, paddingTop: 4, paddingBottom: 4, fontSize: '0.78rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} style={{ color: '#94a3b8' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: 130, padding: '4px 8px', fontSize: '0.78rem' }}
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="In Progress">Devam Eden</option>
              <option value="Pending">Beklemede</option>
              <option value="Delayed">Gecikmiş</option>
              <option value="Completed">Tamamlandı</option>
            </select>
          </div>
        </div>

        {/* Legend - Flat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.72rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: '#dc2626' }}></span>
            <span>Gecikmiş</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: '#d97706' }}></span>
            <span>Yaklaşan</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: '#0284c7' }}></span>
            <span>Planlı</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: '#16a34a' }}></span>
            <span>Tamamlandı</span>
          </div>
        </div>
      </div>

      {/* Gantt Timeline Container - Flat Sharp */}
      <div className="gantt-container" style={{ border: '1px solid #1f293d', overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: totalDays * cellWidth + 240 }}>
          
          {/* Left Fixed Column: Task Titles */}
          <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid #334155', background: '#0d131f', zIndex: 30, position: 'sticky', left: 0 }}>
            {/* Header */}
            <div style={{ height: 42, borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '0 10px', fontWeight: 700, fontSize: '0.75rem', color: '#94a3b8', background: '#111827' }}>
              Görev & Ekip
            </div>

            {/* Task Rows Titles */}
            {Array.from(groupedTasks.entries()).map(([groupName, groupList]) => (
              <div key={groupName}>
                {/* Group Heading */}
                <div style={{
                  padding: '4px 10px',
                  background: '#0b1626',
                  borderBottom: '1px solid #1f293d',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Users size={12} /> {groupName} ({groupList.length})
                </div>

                {groupList.map(task => {
                  const end = new Date(task.EndTime);
                  const remDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = remDays < 0 && task.Status !== 'Completed';

                  return (
                    <div
                      key={task.TaskId}
                      onClick={() => onEditTask(task)}
                      style={{
                        height: 40,
                        borderBottom: '1px solid #1f293d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        cursor: 'pointer',
                        fontSize: '0.72rem'
                      }}
                      title="Düzenlemek için tıkla"
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          <span style={{ color: '#38bdf8', marginRight: 4 }}>#{task.TaskId}</span>
                          {task.TaskType}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.HizmetNo ? `Hzm: ${task.HizmetNo} | ` : ''}
                          {task.Santral || task.Amirlik ? `${task.Santral || task.Amirlik} | ` : ''}
                          {task.DurationDays}g
                        </div>
                      </div>

                      <div style={{
                        padding: '1px 5px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: isOverdue ? '#dc2626' : '#1e293b',
                        color: isOverdue ? '#ffffff' : '#94a3b8',
                        whiteSpace: 'nowrap'
                      }}>
                        {isOverdue ? `${remDays}g` : `+${remDays}g`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right Scrollable Timeline Grid */}
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Timeline Header (Days) */}
            <div style={{ display: 'flex', height: 42, background: '#111827', borderBottom: '1px solid #334155' }}>
              {datesList.map((d, index) => {
                const isToday = d.toDateString() === now.toDateString();
                const dayName = d.toLocaleDateString('tr-TR', { weekday: 'short' });
                const dayNum = d.getDate();
                const month = d.toLocaleDateString('tr-TR', { month: 'short' });

                return (
                  <div
                    key={index}
                    style={{
                      width: cellWidth,
                      flexShrink: 0,
                      borderRight: '1px solid #1f293d',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isToday ? '#082f49' : undefined,
                      color: isToday ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.68rem'
                    }}
                  >
                    <span style={{ fontWeight: isToday ? 800 : 500 }}>{dayNum} {month}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{dayName}</span>
                  </div>
                );
              })}
            </div>

            {/* Timeline Grid Content */}
            {Array.from(groupedTasks.entries()).map(([groupName, groupList]) => (
              <div key={groupName}>
                {/* Group Spacer */}
                <div style={{
                  height: 25,
                  background: '#0b1626',
                  borderBottom: '1px solid #1f293d'
                }} />

                {/* Task Bars */}
                {groupList.map(task => {
                  const taskStart = new Date(task.StartTime);
                  taskStart.setHours(0, 0, 0, 0);

                  const taskEnd = new Date(task.EndTime);
                  taskEnd.setHours(0, 0, 0, 0);

                  const offsetDays = (taskStart.getTime() - startDate.getTime()) / 86400000;
                  const durationSpan = Math.max((taskEnd.getTime() - taskStart.getTime()) / 86400000 + 1, 1);

                  const left = offsetDays * cellWidth;
                  const width = durationSpan * cellWidth;

                  const remainingDays = Math.ceil((taskEnd.getTime() - now.getTime()) / 86400000);
                  const isOverdue = remainingDays < 0 && task.Status !== 'Completed';
                  const isDueSoon = remainingDays >= 0 && remainingDays <= (task.NotificationBeforeDays || 2) && task.Status !== 'Completed';
                  const isCompleted = task.Status === 'Completed';

                  let barBg = '#0284c7';
                  let borderColor = '#0369a1';

                  if (isCompleted) {
                    barBg = '#16a34a';
                    borderColor = '#15803d';
                  } else if (isOverdue) {
                    barBg = '#dc2626';
                    borderColor = '#b91c1c';
                  } else if (isDueSoon) {
                    barBg = '#d97706';
                    borderColor = '#b45309';
                  }

                  return (
                    <div
                      key={task.TaskId}
                      style={{
                        height: 40,
                        borderBottom: '1px solid #1f293d',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {/* Background grid vertical lines */}
                      {datesList.map((_, i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: i * cellWidth,
                            top: 0,
                            bottom: 0,
                            width: cellWidth,
                            borderRight: '1px solid #111827',
                            pointerEvents: 'none'
                          }}
                        />
                      ))}

                      {/* Today Indicator Line */}
                      {(() => {
                        const todayOffset = (now.getTime() - startDate.getTime()) / 86400000;
                        if (todayOffset >= 0 && todayOffset <= totalDays) {
                          return (
                            <div
                              style={{
                                position: 'absolute',
                                left: todayOffset * cellWidth + cellWidth / 2,
                                top: 0,
                                bottom: 0,
                                width: 2,
                                background: '#38bdf8',
                                zIndex: 15,
                                pointerEvents: 'none'
                              }}
                            />
                          );
                        }
                        return null;
                      })()}

                      {/* Gantt Bar - Flat Sharp */}
                      <div
                        onClick={() => onEditTask(task)}
                        className="gantt-bar"
                        style={{
                          left: Math.max(left, 0),
                          width: Math.max(width, cellWidth),
                          background: barBg,
                          border: `1px solid ${borderColor}`
                        }}
                        title={`Görev: ${task.TaskId} (${task.TaskType})\nSüre: ${task.DurationDays} Gün\nKalan: ${remainingDays} Gün\nDüzenlemek için tıklayın.`}
                      >
                        <span style={{ marginRight: 4, fontWeight: 700 }}>#{task.TaskId}</span>
                        <span style={{ opacity: 0.9 }}>
                          ({task.DurationDays}g - {isOverdue ? `${remainingDays}g gecikmiş` : `${remainingDays}g`})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          </div>

        </div>
      </div>
    </div>
  );
};
