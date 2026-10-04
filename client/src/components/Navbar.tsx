import React from 'react';
import { 
  MapPin, 
  BarChart3, 
  Table, 
  LayoutDashboard, 
  Upload, 
  Bell,
  Users, 
  Navigation,
  RefreshCw,
  CheckCircle2,
  Clock,
  GitCompare
} from 'lucide-react';
import { Globe } from 'lucide-react';
import { Team, NotificationItem } from '../types';

interface NavbarProps {
  mainMode: 'pending' | 'completed' | 'comparison';
  setMainMode: (mode: 'pending' | 'completed' | 'comparison') => void;
  activeTab: 'map' | 'gantt' | 'table' | 'split';
  setActiveTab: (tab: 'map' | 'gantt' | 'table' | 'split') => void;
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onOpenUpload: () => void;
  onOpenCompletedUpload: () => void;
  onFindNearest: () => void;
  notifications: NotificationItem[];
  onTriggerCheck: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  pendingCount: number;
  completedCount: number;
  onOpenHattatSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mainMode,
  setMainMode,
  activeTab,
  setActiveTab,
  teams,
  selectedTeamId,
  onSelectTeam,
  onOpenUpload,
  onOpenCompletedUpload,
  onFindNearest,
  notifications,
  onTriggerCheck,
  onRefreshData,
  isRefreshing,
  pendingCount,
  completedCount,
  onOpenHattatSync
}) => {
  const [showNotifMenu, setShowNotifMenu] = React.useState(false);
  const overdueCount = notifications.filter(n => n.isOverdue).length;

  return (
    <header className="panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '6px 12px', background: '#0d131f' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            background: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '0.85rem'
          }}>
            TT
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#f8fafc' }}>
              GeoGantt
            </span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Operasyon Yönetimi
            </span>
          </div>
        </div>

        {/* 1. MAIN MODE SWITCHER: BEKLEYEN İŞLER vs YAPILAN İŞLER vs KARŞILAŞTIRMA */}
        <div style={{
          display: 'flex',
          background: '#0b0f19',
          border: '1px solid #334155'
        }}>
          <button
            onClick={() => setMainMode('pending')}
            className="btn"
            style={{
              background: mainMode === 'pending' ? '#0284c7' : 'transparent',
              color: mainMode === 'pending' ? '#ffffff' : '#94a3b8',
              border: 'none',
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 700
            }}
          >
            <Clock size={13} /> Bekleyen İşler ({pendingCount})
          </button>
          <button
            onClick={() => setMainMode('completed')}
            className="btn"
            style={{
              background: mainMode === 'completed' ? '#16a34a' : 'transparent',
              color: mainMode === 'completed' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderLeft: '1px solid #334155',
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 700
            }}
          >
            <CheckCircle2 size={13} /> Yapılan İşler ({completedCount})
          </button>
          <button
            onClick={() => setMainMode('comparison')}
            className="btn"
            style={{
              background: mainMode === 'comparison' ? '#0284c7' : 'transparent',
              color: mainMode === 'comparison' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderLeft: '1px solid #334155',
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 700
            }}
          >
            <GitCompare size={13} /> Karşılaştırma & Mutabakat
          </button>
        </div>

        {/* Sub Tab Navigation (Active when in 'pending' mode) */}
        {mainMode === 'pending' && (
          <div style={{
            display: 'flex',
            background: '#0b0f19',
            border: '1px solid #1f293d'
          }}>
            <button
              onClick={() => setActiveTab('map')}
              className="btn"
              style={{ 
                background: activeTab === 'map' ? '#1e293b' : 'transparent',
                color: activeTab === 'map' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                padding: '4px 10px', 
                fontSize: '0.75rem',
                fontWeight: activeTab === 'map' ? 700 : 500
              }}
            >
              <MapPin size={13} /> Harita & Rota
            </button>
            <button
              onClick={() => setActiveTab('gantt')}
              className="btn"
              style={{ 
                background: activeTab === 'gantt' ? '#1e293b' : 'transparent',
                color: activeTab === 'gantt' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderLeft: '1px solid #1f293d',
                padding: '4px 10px', 
                fontSize: '0.75rem',
                fontWeight: activeTab === 'gantt' ? 700 : 500
              }}
            >
              <BarChart3 size={13} /> Gantt Şeması
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className="btn"
              style={{ 
                background: activeTab === 'table' ? '#1e293b' : 'transparent',
                color: activeTab === 'table' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderLeft: '1px solid #1f293d',
                padding: '4px 10px', 
                fontSize: '0.75rem',
                fontWeight: activeTab === 'table' ? 700 : 500
              }}
            >
              <Table size={13} /> Görev Tablosu
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className="btn"
              style={{ 
                background: activeTab === 'split' ? '#1e293b' : 'transparent',
                color: activeTab === 'split' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderLeft: '1px solid #1f293d',
                padding: '4px 10px', 
                fontSize: '0.75rem',
                fontWeight: activeTab === 'split' ? 700 : 500
              }}
            >
              <LayoutDashboard size={13} /> Bölünmüş Panel
            </button>
          </div>
        )}

        {/* Right Actions & Utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Active Team Select (Only in pending mode) */}
          {mainMode === 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0b0f19', padding: '3px 6px', border: '1px solid #334155' }}>
              <Users size={13} style={{ color: '#38bdf8' }} />
              <select
                value={selectedTeamId}
                onChange={(e) => onSelectTeam(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <option value="" style={{ background: '#0b0f19', color: '#94a3b8' }}>Tüm Ekipler</option>
                {teams.map(t => (
                  <option key={t.TeamId} value={t.TeamId} style={{ background: '#0b0f19', color: '#f8fafc' }}>
                    {t.TeamName} ({t.TeamId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Route to Nearest Task (Only in pending mode) */}
          {mainMode === 'pending' && selectedTeamId && (
            <button
              onClick={onFindNearest}
              className="btn btn-secondary"
              title="Seçili ekip için en yakın göreve rota hesapla"
              style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#0284c7', color: '#38bdf8' }}
            >
              <Navigation size={12} /> En Yakın
            </button>
          )}

          {/* HaTTat BBK Adres Çek Butonu */}
          {mainMode === 'pending' && onOpenHattatSync && (
            <button
              onClick={onOpenHattatSync}
              className="btn"
              title="HaTTat üzerinden BBK kodlarını otomatik sorgula ve müşteri adreslerini getir"
              style={{
                padding: '4px 9px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#008488',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 1px 4px rgba(0, 132, 136, 0.4)'
              }}
            >
              <Globe size={13} />
              HaTTat Adres Çek
            </button>
          )}

          {/* Upload Excel Button: switches based on active main mode */}
          {mainMode === 'pending' ? (
            <button
              onClick={onOpenUpload}
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              <Upload size={12} /> Bekleyen İşler Exceli
            </button>
          ) : (
            <button
              onClick={onOpenCompletedUpload}
              className="btn btn-primary"
              style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#16a34a', borderColor: '#16a34a' }}
            >
              <Upload size={12} /> Yapılan İşler Exceli
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefreshData}
            className="btn btn-secondary"
            title="Verileri Yenile"
            style={{ padding: '4px 6px' }}
          >
            <RefreshCw size={12} />
          </button>

          {/* Notifications Dropdown (for pending tasks alerts) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="btn btn-secondary"
              style={{ padding: '4px 6px', position: 'relative' }}
              title="Bildirimler"
            >
              <Bell size={13} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: overdueCount > 0 ? '#dc2626' : '#d97706',
                  color: 'white',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '0 3px',
                  lineHeight: '12px'
                }}>
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div
                className="panel-elevated"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: 300,
                  zIndex: 9999,
                  padding: 8,
                  background: '#111827',
                  border: '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, borderBottom: '1px solid #1f293d', paddingBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#f8fafc' }}>Uyarı ve Bildirimler</span>
                  <button
                    onClick={onTriggerCheck}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.7rem', cursor: 'pointer' }}
                  >
                    Şimdi Kontrol Et
                  </button>
                </div>


                {notifications.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>
                    Henüz yaklaşan veya geciken görev bildirimi yok.
                  </div>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          background: n.isOverdue ? '#281113' : '#281f11',
                          borderLeft: `3px solid ${n.isOverdue ? '#dc2626' : '#d97706'}`,
                          padding: '4px 6px',
                          fontSize: '0.72rem'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: n.isOverdue ? '#f87171' : '#fbbf24' }}>
                          {n.title}
                        </div>
                        <div style={{ color: '#cbd5e1', marginTop: 1 }}>{n.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
