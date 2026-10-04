import React from 'react';
import { Users, CheckCircle2, AlertTriangle, Clock, Route } from 'lucide-react';
import { Team, Task, RouteResponse, NearestResponse } from '../types';

interface StatsOverviewProps {
  teams: Team[];
  tasks: Task[];
  activeRoute: RouteResponse | null;
  nearestInfo: NearestResponse | null;
  selectedTeam: Team | undefined;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  teams,
  tasks,
  activeRoute,
  nearestInfo,
  selectedTeam
}) => {
  const now = new Date();

  // Calculate overdue tasks (remaining days < 0 and status != Completed)
  const overdueTasks = tasks.filter(t => {
    if (t.Status === 'Completed') return false;
    const end = new Date(t.EndTime);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays < 0;
  });

  // Calculate due soon tasks (remaining days <= NotificationBeforeDays and > 0)
  const dueSoonTasks = tasks.filter(t => {
    if (t.Status === 'Completed') return false;
    const end = new Date(t.EndTime);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= (t.NotificationBeforeDays || 2);
  });

  const completedTasks = tasks.filter(t => t.Status === 'Completed');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 8,
      marginBottom: 10
    }}>
      {/* Total Teams Card */}
      <div className="panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          background: '#0c284e',
          color: '#38bdf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #0284c7'
        }}>
          <Users size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Saha Ekipleri</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
            {teams.length}
          </div>
        </div>
      </div>

      {/* Active Tasks Card */}
      <div className="panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          background: '#1e293b',
          color: '#0284c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #334155'
        }}>
          <Clock size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aktif Görevler</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
            {tasks.length - completedTasks.length} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/ {tasks.length}</span>
          </div>
        </div>
      </div>

      {/* Overdue Tasks Card */}
      <div
        className="panel"
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderLeft: overdueTasks.length > 0 ? '3px solid #dc2626' : undefined,
          background: overdueTasks.length > 0 ? '#1f1315' : undefined
        }}
      >
        <div style={{
          width: 32,
          height: 32,
          background: overdueTasks.length > 0 ? '#450a0a' : '#1e293b',
          color: overdueTasks.length > 0 ? '#f87171' : '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: overdueTasks.length > 0 ? '1px solid #dc2626' : '1px solid #334155'
        }}>
          <AlertTriangle size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: overdueTasks.length > 0 ? '#fca5a5' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Geciken Görevler
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: overdueTasks.length > 0 ? '#ef4444' : '#f8fafc', lineHeight: 1.2 }}>
            {overdueTasks.length}
          </div>
        </div>
      </div>

      {/* Due Soon Tasks Card */}
      <div
        className="panel"
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderLeft: dueSoonTasks.length > 0 ? '3px solid #d97706' : undefined,
          background: dueSoonTasks.length > 0 ? '#1f1a10' : undefined
        }}
      >
        <div style={{
          width: 32,
          height: 32,
          background: dueSoonTasks.length > 0 ? '#451a03' : '#1e293b',
          color: dueSoonTasks.length > 0 ? '#fbbf24' : '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: dueSoonTasks.length > 0 ? '1px solid #d97706' : '1px solid #334155'
        }}>
          <Clock size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: dueSoonTasks.length > 0 ? '#fde68a' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Yaklaşan Bitişler
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: dueSoonTasks.length > 0 ? '#f59e0b' : '#f8fafc', lineHeight: 1.2 }}>
            {dueSoonTasks.length}
          </div>
        </div>
      </div>

      {/* Completed Tasks Card */}
      <div className="panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          background: '#052e16',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #16a34a'
        }}>
          <CheckCircle2 size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tamamlanan</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
            {completedTasks.length}
          </div>
        </div>
      </div>
    </div>
  );
};
