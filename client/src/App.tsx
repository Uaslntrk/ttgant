import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  getTeams, 
  getTasks, 
  getNearestTask, 
  getRoute, 
  updateTask, 
  getNotifications, 
  triggerNotificationCheck,
  deleteNotification,
  clearAllNotifications,
  updateTeamLocation,
  getCompletedTasks,
  clearCompletedTasks
} from './api';
import { Team, Task, RouteResponse, NearestResponse, NotificationItem, CompletedTask } from './types';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { MapView } from './components/MapView';
import { GanttView } from './components/GanttView';
import { TaskTable } from './components/TaskTable';
import { TaskEditModal } from './components/TaskEditModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { CompletedTasksView } from './components/CompletedTasksView';
import { CompletedExcelModal } from './components/CompletedExcelModal';
import { ComparisonView } from './components/ComparisonView';
import { HattatSyncModal } from './components/HattatSyncModal';

export const App: React.FC = () => {
  // Main Mode: 'pending' (Bekleyen İşler), 'completed' (Yapılan İşler) or 'comparison' (Karşılaştırma & Mutabakat)
  const [mainMode, setMainMode] = useState<'pending' | 'completed' | 'comparison'>('pending');

  // Pending tasks & operational state
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'map' | 'gantt' | 'table' | 'split'>('map');
  const [activeRoute, setActiveRoute] = useState<RouteResponse | null>(null);
  const [nearestInfo, setNearestInfo] = useState<NearestResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Completed tasks state
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [isCompletedUploadOpen, setIsCompletedUploadOpen] = useState<boolean>(false);

  // Modals state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isHattatModalOpen, setIsHattatModalOpen] = useState<boolean>(false);

  // ================= SHARED FILTER STATE (Yapılan İşler & Karşılaştırma) =================
  const [completedFilterTeams, setCompletedFilterTeams] = useState<Set<string>>(new Set());
  const [completedFilterTypes, setCompletedFilterTypes] = useState<Set<string>>(new Set());
  const [completedFilterHizmetler, setCompletedFilterHizmetler] = useState<Set<string>>(new Set());
  const [completedFilterStatuses, setCompletedFilterStatuses] = useState<Set<string>>(new Set());
  const [completedFilterAmirlikler, setCompletedFilterAmirlikler] = useState<Set<string>>(new Set());
  const [completedSearchTerm, setCompletedSearchTerm] = useState<string>('');

  const filtersInitializedRef = useRef<boolean>(false);

  // Extract available distinct values
  const allAvailableTeams = useMemo(() => {
    const set = new Set<string>();
    teams.forEach(t => { if (t.TeamName) set.add(t.TeamName.trim()); });
    tasks.forEach(t => { if (t.TeamName) set.add(t.TeamName.trim()); });
    completedTasks.forEach(c => { if (c.EkipAdi) set.add(c.EkipAdi.trim()); });
    return Array.from(set).sort();
  }, [teams, tasks, completedTasks]);

  const allAvailableTypes = useMemo(() => {
    const set = new Set<string>();
    completedTasks.forEach(c => { if (c.IsemriTipi) set.add(c.IsemriTipi.trim()); });
    tasks.forEach(t => { if (t.TaskType) set.add(t.TaskType.trim()); });
    return Array.from(set).sort();
  }, [completedTasks, tasks]);

  const allAvailableHizmetler = useMemo(() => {
    const set = new Set<string>();
    completedTasks.forEach(c => { 
      const h = (c.HizmetTuru || '').trim();
      set.add(h || '(Belirtilmemiş)'); 
    });
    return Array.from(set).sort();
  }, [completedTasks]);

  const allAvailableStatuses = useMemo(() => {
    const set = new Set<string>();
    completedTasks.forEach(c => { 
      const s = (c.Durumu || '').trim();
      set.add(s || '(Belirtilmemiş)'); 
    });
    return Array.from(set).sort();
  }, [completedTasks]);

  const allAvailableAmirlikler = useMemo(() => {
    const set = new Set<string>();
    completedTasks.forEach(c => { if (c.MudurlukAmirlik) set.add(c.MudurlukAmirlik.trim()); });
    tasks.forEach(t => { if (t.Amirlik) set.add(t.Amirlik.trim()); });
    return Array.from(set).sort();
  }, [completedTasks, tasks]);

  // Synchronize/initialize default filters (ALL CHECKED)
  useEffect(() => {
    if (!filtersInitializedRef.current && (allAvailableTeams.length > 0 || allAvailableTypes.length > 0)) {
      setCompletedFilterTeams(new Set(allAvailableTeams));
      setCompletedFilterTypes(new Set(allAvailableTypes));
      setCompletedFilterHizmetler(new Set(allAvailableHizmetler));
      setCompletedFilterStatuses(new Set(allAvailableStatuses));
      setCompletedFilterAmirlikler(new Set(allAvailableAmirlikler));
      filtersInitializedRef.current = true;
    }
  }, [allAvailableTeams, allAvailableTypes, allAvailableHizmetler, allAvailableStatuses, allAvailableAmirlikler]);

  // Reset shared filters
  const handleResetSharedFilters = useCallback(() => {
    setCompletedFilterTeams(new Set(allAvailableTeams));
    setCompletedFilterTypes(new Set(allAvailableTypes));
    setCompletedFilterHizmetler(new Set(allAvailableHizmetler));
    setCompletedFilterStatuses(new Set(allAvailableStatuses));
    setCompletedFilterAmirlikler(new Set(allAvailableAmirlikler));
    setCompletedSearchTerm('');
  }, [allAvailableTeams, allAvailableTypes, allAvailableHizmetler, allAvailableStatuses, allAvailableAmirlikler]);

  // Ensure Leaflet map recalculates its dimensions whenever tab switches
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 60);
    return () => clearTimeout(timer);
  }, [mainMode, activeTab]);

  const showToast = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load pending tasks and teams
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [teamsData, tasksData, notifs, completedData] = await Promise.all([
        getTeams(),
        getTasks(),
        getNotifications(),
        getCompletedTasks()
      ]);
      setTeams(teamsData);
      setTasks(tasksData);
      setNotifications(notifs);
      setCompletedTasks(completedData);
    } catch (err: any) {
      console.error('Veri yükleme hatası:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const loadCompletedData = useCallback(async () => {
    try {
      const data = await getCompletedTasks();
      setCompletedTasks(data);
      filtersInitializedRef.current = false;
    } catch (err: any) {
      console.error('Yapılan işler yüklenemedi:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Bildirimleri her 60 saniyede bir güncelle
    const interval = setInterval(async () => {
      try {
        const notifs = await getNotifications();
        setNotifications(notifs);
      } catch (e) {
        // ignore
      }
    }, 60000);

    // Canlı görev yenileme her 30 saniyede bir
    const taskInterval = setInterval(async () => {
      try {
        const tasksData = await getTasks();
        setTasks(tasksData);
      } catch (e) {
        console.error('Canlı görev yenileme hatası:', e);
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(taskInterval);
    };
  }, []);

  // Handle Find Nearest Task for selected team
  const handleFindNearest = async () => {
    const targetTeamId = selectedTeamId || (teams[0] && teams[0].TeamId);
    if (!targetTeamId) {
      showToast('Lütfen önce bir ekip seçin.', 'warning');
      return;
    }

    try {
      const nearestRes = await getNearestTask(targetTeamId);
      setNearestInfo(nearestRes);

      if (nearestRes.nearestTask) {
        showToast(
          `En yakın görev: #${nearestRes.nearestTask.TaskId} (${nearestRes.distanceKm} km)`,
          'info'
        );
        const routeData = await getRoute(targetTeamId, nearestRes.nearestTask.TaskId);
        setActiveRoute(routeData);
        setActiveTab('map');
      } else {
        showToast('Atanabilecek görev bulunamadı.', 'info');
      }
    } catch (err: any) {
      showToast(`En yakın görev hatası: ${err.message}`, 'warning');
    }
  };

  // Handle Draw Route between team and task
  const handleDrawRoute = async (teamId: string, taskId: string) => {
    try {
      const routeData = await getRoute(teamId, taskId);
      setActiveRoute(routeData);
      showToast(
        `Rota oluşturuldu: ${routeData.distanceKm} km (~${routeData.durationMinutes} dk)`,
        'success'
      );
    } catch (err: any) {
      showToast(`Rota hesaplanamadı: ${err.message}`, 'warning');
    }
  };

  // Clear current route
  const handleClearRoute = () => {
    setActiveRoute(null);
    setNearestInfo(null);
  };

  // Save task edits
  const handleSaveTask = async (taskId: string, updatedFields: { DurationDays: number; NotificationBeforeDays: number }) => {
    const result = await updateTask(taskId, updatedFields);
    if (result.success) {
      showToast(`Görev #${taskId} planlama parametreleri güncellendi.`, 'success');
      await loadData();
    }
  };

  // Navigate to Map and draw route to task
  const handleNavigateToMapWithTask = (task: Task) => {
    setMainMode('pending');
    setActiveTab('map');
    const teamIdToUse = selectedTeamId || task.TeamId || (teams[0] && teams[0].TeamId);
    if (teamIdToUse) {
      handleDrawRoute(teamIdToUse, task.TaskId);
    }
  };

  // Trigger manual notification check
  const handleTriggerCheck = async () => {
    try {
      const res = await triggerNotificationCheck();
      showToast(`Bildirim kontrolü tamamlandı: ${res.triggeredCount} adet görev uyarı verdi.`, 'info');
      const notifs = await getNotifications();
      setNotifications(notifs);
    } catch (err: any) {
      showToast(`Bildirim kontrolü hatası: ${err.message}`, 'warning');
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast('Bildirim silindi.', 'info');
    } catch (err: any) {
      showToast(`Bildirim silinemedi: ${err.message}`, 'warning');
    }
  };

  // Clear all notifications
  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      showToast('Tüm bildirimler temizlendi.', 'info');
    } catch (err: any) {
      showToast(`Bildirimler temizlenemedi: ${err.message}`, 'warning');
    }
  };

  // Update team location
  const handleUpdateTeamLocation = async (teamId: string, lat: number, lng: number) => {
    try {
      await updateTeamLocation(teamId, lat, lng);
      setTeams(prev => prev.map(t => t.TeamId === teamId ? { ...t, Latitude: lat, Longitude: lng } : t));
      showToast(`Ekip #${teamId} konumu güncellendi (${lat.toFixed(4)}, ${lng.toFixed(4)}).`, 'success');
    } catch (err: any) {
      showToast(`Ekip konumu güncellenemedi: ${err.message}`, 'warning');
    }
  };

  // Clear completed tasks table
  const handleClearCompleted = async () => {
    if (window.confirm('Yapılan işler veritabanı temizlensin mi?')) {
      try {
        await clearCompletedTasks();
        showToast('Yapılan işler veritabanı temizlendi.', 'info');
        await loadCompletedData();
      } catch (e: any) {
        showToast('Temizleme hatası: ' + e.message, 'warning');
      }
    }
  };

  const selectedTeam = teams.find(t => t.TeamId === selectedTeamId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Popup */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 99999,
          padding: '8px 16px',
          fontSize: '0.8rem',
          fontWeight: 700,
          background: toastMessage.type === 'success' 
            ? '#16a34a' 
            : toastMessage.type === 'warning'
            ? '#d97706'
            : '#0284c7',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {toastMessage.text}
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        mainMode={mainMode}
        setMainMode={setMainMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={setSelectedTeamId}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCompletedUpload={() => setIsCompletedUploadOpen(true)}
        onFindNearest={handleFindNearest}
        notifications={notifications}
        onTriggerCheck={handleTriggerCheck}
        onDeleteNotification={handleDeleteNotification}
        onClearNotifications={handleClearAllNotifications}
        onRefreshData={loadData}
        isRefreshing={isRefreshing}
        pendingCount={tasks.length}
        completedCount={completedTasks.length}
        onOpenHattatSync={() => setIsHattatModalOpen(true)}
      />

      {/* Main Content Area - Maximized Screen Real Estate */}
      <main style={{ flex: 1, padding: '8px 10px', width: '100%' }}>
        {/* 1. BEKLEYEN İŞLER MODE (Persistent DOM - keeps filters and scroll position intact) */}
        <div style={{ display: mainMode === 'pending' ? 'block' : 'none' }}>
          {/* Statistics and Quick Status Cards */}
          <StatsOverview
            teams={teams}
            tasks={tasks}
            activeRoute={activeRoute}
            nearestInfo={nearestInfo}
            selectedTeam={selectedTeam}
          />

          {/* Sub-tabs with preserved states */}
          <div style={{ display: activeTab === 'map' ? 'block' : 'none' }}>
            <MapView
              teams={teams}
              tasks={tasks}
              selectedTeamId={selectedTeamId}
              onSelectTeam={setSelectedTeamId}
              activeRoute={activeRoute}
              onDrawRoute={handleDrawRoute}
              onClearRoute={handleClearRoute}
              onEditTask={(task) => setEditingTask(task)}
              onFindNearest={handleFindNearest}
              onUpdateTeamLocation={handleUpdateTeamLocation}
            />
          </div>

          <div style={{ display: activeTab === 'gantt' ? 'block' : 'none' }}>
            <GanttView
              tasks={tasks}
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelectTeam={setSelectedTeamId}
              onEditTask={(task) => setEditingTask(task)}
            />
          </div>

          <div style={{ display: activeTab === 'table' ? 'block' : 'none' }}>
            <TaskTable
              tasks={tasks}
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelectTeam={setSelectedTeamId}
              onEditTask={(task) => setEditingTask(task)}
              onNavigateToMapWithTask={handleNavigateToMapWithTask}
            />
          </div>

          {activeTab === 'split' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 8 }}>
              <div>
                <MapView
                  teams={teams}
                  tasks={tasks}
                  selectedTeamId={selectedTeamId}
                  onSelectTeam={setSelectedTeamId}
                  activeRoute={activeRoute}
                  onDrawRoute={handleDrawRoute}
                  onClearRoute={handleClearRoute}
                  onEditTask={(task) => setEditingTask(task)}
                  onFindNearest={handleFindNearest}
                  onUpdateTeamLocation={handleUpdateTeamLocation}
                />
              </div>
              <div>
                <TaskTable
                  tasks={tasks}
                  teams={teams}
                  selectedTeamId={selectedTeamId}
                  onSelectTeam={setSelectedTeamId}
                  onEditTask={(task) => setEditingTask(task)}
                  onNavigateToMapWithTask={handleNavigateToMapWithTask}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. YAPILAN İŞLER MODE (Persistent DOM + Shared Filters) */}
        <div style={{ display: mainMode === 'completed' ? 'block' : 'none' }}>
          <CompletedTasksView
            tasks={completedTasks}
            onOpenUpload={() => setIsCompletedUploadOpen(true)}
            onRefresh={loadCompletedData}
            onClear={handleClearCompleted}
            selectedTeams={completedFilterTeams}
            setSelectedTeams={setCompletedFilterTeams}
            selectedTypes={completedFilterTypes}
            setSelectedTypes={setCompletedFilterTypes}
            selectedHizmetler={completedFilterHizmetler}
            setSelectedHizmetler={setCompletedFilterHizmetler}
            selectedStatuses={completedFilterStatuses}
            setSelectedStatuses={setCompletedFilterStatuses}
            selectedAmirlikler={completedFilterAmirlikler}
            setSelectedAmirlikler={setCompletedFilterAmirlikler}
            searchTerm={completedSearchTerm}
            setSearchTerm={setCompletedSearchTerm}
            onResetFilters={handleResetSharedFilters}
            availableTeams={allAvailableTeams}
            availableTypes={allAvailableTypes}
            availableHizmetler={allAvailableHizmetler}
            availableStatuses={allAvailableStatuses}
            availableAmirlikler={allAvailableAmirlikler}
          />
        </div>

        {/* 3. KARŞILAŞTIRMA & MUTABAKAT MODE (Persistent DOM + Shared Filters + Quick Team Select) */}
        <div style={{ display: mainMode === 'comparison' ? 'block' : 'none' }}>
          <ComparisonView
            tasks={tasks}
            completedTasks={completedTasks}
            teams={teams}
            selectedTeams={completedFilterTeams}
            setSelectedTeams={setCompletedFilterTeams}
            selectedTypes={completedFilterTypes}
            setSelectedTypes={setCompletedFilterTypes}
            selectedHizmetler={completedFilterHizmetler}
            setSelectedHizmetler={setCompletedFilterHizmetler}
            selectedStatuses={completedFilterStatuses}
            setSelectedStatuses={setCompletedFilterStatuses}
            selectedAmirlikler={completedFilterAmirlikler}
            setSelectedAmirlikler={setCompletedFilterAmirlikler}
            searchTerm={completedSearchTerm}
            setSearchTerm={setCompletedSearchTerm}
            onResetFilters={handleResetSharedFilters}
            availableTeams={allAvailableTeams}
            availableTypes={allAvailableTypes}
            availableHizmetler={allAvailableHizmetler}
            availableStatuses={allAvailableStatuses}
            availableAmirlikler={allAvailableAmirlikler}
          />
        </div>
      </main>

      {/* Task Edit Modal (Manual Duration & Notification Entry) */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          teams={teams}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveTask}
        />
      )}

      {/* Bekleyen İşler Excel Upload Modal */}
      {isUploadOpen && (
        <ExcelUploadModal
          onClose={() => setIsUploadOpen(false)}
          onSuccess={loadData}
        />
      )}

      {/* Yapılan İşler Excel Upload Modal */}
      {isCompletedUploadOpen && (
        <CompletedExcelModal
          onClose={() => setIsCompletedUploadOpen(false)}
          onSuccess={loadCompletedData}
        />
      )}

      {/* HaTTat BBK Adres Sorgulama Modal */}
      {isHattatModalOpen && (
        <HattatSyncModal
          tasks={tasks}
          onClose={() => setIsHattatModalOpen(false)}
          onSuccess={() => {
            loadData();
            showToast('Hattat adres sorgulaması tamamlandı ve veriler güncellendi!', 'success');
          }}
        />
      )}
    </div>
  );
};

export default App;
