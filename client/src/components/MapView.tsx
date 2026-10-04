import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  Users, 
  MapPin, 
  Navigation, 
  Route as RouteIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  X, 
  Filter, 
  Search, 
  RotateCcw, 
  Briefcase,
  Building,
  ArrowRight
} from 'lucide-react';
import { Team, Task, RouteResponse } from '../types';
import { MultiSelectFilter } from './MultiSelectFilter';

interface MapViewProps {
  teams: Team[];
  tasks: Task[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  activeRoute: RouteResponse | null;
  onDrawRoute: (teamId: string, taskId: string) => void;
  onClearRoute: () => void;
  onEditTask: (task: Task) => void;
  onFindNearest: () => void;
  onUpdateTeamLocation?: (teamId: string, lat: number, lng: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  teams,
  tasks,
  selectedTeamId,
  onSelectTeam,
  activeRoute,
  onDrawRoute,
  onClearRoute,
  onEditTask,
  onFindNearest,
  onUpdateTeamLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);

  // Map-level filters
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<Set<string>>(() => new Set());
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected team object
  const currentTeam = useMemo(() => {
    return teams.find(t => t.TeamId === selectedTeamId) || null;
  }, [teams, selectedTeamId]);

  // Tasks belonging ONLY to the selected team (Rule: only show team's tasks after team is selected!)
  const teamTasks = useMemo(() => {
    if (!selectedTeamId) return [];
    const teamObj = teams.find(t => String(t.TeamId) === String(selectedTeamId));
    return tasks.filter(t => 
      String(t.TeamId) === String(selectedTeamId) || 
      (teamObj && t.TeamName && t.TeamName.trim().toLowerCase() === teamObj.TeamName.trim().toLowerCase())
    );
  }, [tasks, selectedTeamId, teams]);

  // Unique task types / categories for the selected team
  const availableTaskTypes = useMemo(() => {
    const set = new Set<string>();
    teamTasks.forEach(t => {
      if (t.TaskType) set.add(t.TaskType.trim());
    });
    return Array.from(set).sort();
  }, [teamTasks]);

  // Auto-populate all types as checked by default
  useEffect(() => {
    if (availableTaskTypes.length > 0) {
      setSelectedTaskTypes(new Set(availableTaskTypes));
    }
  }, [availableTaskTypes]);

  // Status counts for the selected team
  const teamStatusCounts = useMemo(() => {
    const now = new Date();
    let overdue = 0;
    let dueSoon = 0;
    let completed = 0;
    let inProgress = 0;

    teamTasks.forEach(t => {
      if (t.Status === 'Completed') {
        completed++;
      } else {
        const end = new Date(t.EndTime);
        const remDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (remDays < 0) {
          overdue++;
        } else if (remDays <= (t.NotificationBeforeDays || 2)) {
          dueSoon++;
        } else {
          inProgress++;
        }
      }
    });

    return { total: teamTasks.length, overdue, dueSoon, completed, inProgress };
  }, [teamTasks]);

  // Reset task type filter when team changes
  useEffect(() => {
    setSelectedTaskTypes(new Set(availableTaskTypes));
  }, [selectedTeamId, availableTaskTypes]);

  // Filtered tasks for rendering on the map
  const visibleTasks = useMemo(() => {
    if (!selectedTeamId) return [];
    const now = new Date();

    return teamTasks.filter(task => {
      // 1. Task Type Filter (Checklist: unchecked items are hidden)
      const tType = (task.TaskType || '').trim();
      if (availableTaskTypes.length > 0 && !selectedTaskTypes.has(tType)) {
        return false;
      }

      // 2. Status Filter
      if (selectedStatus !== 'ALL') {
        const end = new Date(task.EndTime);
        const remDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = remDays < 0 && task.Status !== 'Completed';
        const isDueSoon = remDays >= 0 && remDays <= (task.NotificationBeforeDays || 2) && task.Status !== 'Completed';

        if (selectedStatus === 'OVERDUE' && !isOverdue) return false;
        if (selectedStatus === 'DUE_SOON' && !isDueSoon) return false;
        if (selectedStatus === 'COMPLETED' && task.Status !== 'Completed') return false;
        if (selectedStatus === 'IN_PROGRESS' && (isOverdue || isDueSoon || task.Status === 'Completed')) return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (task.TaskId || '').toLowerCase().includes(q);
        const matchesHzm = (task.HizmetNo || '').toLowerCase().includes(q);
        const matchesSantral = (task.Santral || '').toLowerCase().includes(q);
        const matchesAdres = (task.HizmetAdresi || '').toLowerCase().includes(q);
        const matchesType = (task.TaskType || '').toLowerCase().includes(q);
        if (!matchesId && !matchesHzm && !matchesSantral && !matchesAdres && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [teamTasks, selectedTeamId, availableTaskTypes, selectedTaskTypes, selectedStatus, searchQuery]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered on Fatih district, Istanbul
    const defaultCenter: [number, number] = [41.0096, 28.952]; // Approximate center of Fatih
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false,
    });
    // Define Fatih district bounds (approximate SW and NE corners)
    const fatihBounds = L.latLngBounds([
      [41.001, 28.921], // South-West corner
      [41.021, 28.982], // North-East corner
    ]);
    // Fit map to Fatih bounds, limiting max zoom to keep area viewable
    map.fitBounds(fatihBounds, { padding: [40, 40], maxZoom: 14 });

    // OpenStreetMap tiles (free, no API token required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers: Only render team markers AND selected team's tasks
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    const bounds = L.latLngBounds([]);

    // 1. Render Team Markers - Only show selected team when one is selected, otherwise show all
    const teamsToShow = selectedTeamId ? teams.filter(t => t.TeamId === selectedTeamId) : teams;
    teamsToShow.forEach((team) => {
      const isSelected = team.TeamId === selectedTeamId;
      const countForTeam = tasks.filter(t => t.TeamId === team.TeamId).length;

      const teamIcon = L.divIcon({
        className: 'corporate-team-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="
              background: ${isSelected ? '#0284c7' : '#0f172a'};
              color: #ffffff;
              border: 1px solid ${isSelected ? '#38bdf8' : '#475569'};
              padding: 3px 6px;
              font-family: 'Inter', sans-serif;
              font-weight: 700;
              font-size: 11px;
              display: flex;
              align-items: center;
              gap: 5px;
              white-space: nowrap;
            ">
              <span>👥 ${team.TeamName}</span>
              <span style="
                background: ${isSelected ? '#0369a1' : '#1e293b'};
                color: #ffffff;
                padding: 0 4px;
                font-size: 10px;
                font-weight: 800;
              ">
                ${countForTeam}
              </span>
            </div>
          </div>
        `,
        iconSize: [110, 26],
        iconAnchor: [55, 13]
      });

      const marker = L.marker([team.Latitude, team.Longitude], { 
        icon: teamIcon,
        zIndexOffset: isSelected ? 1000 : 100,
        draggable: isSelected
      });

      marker.on('click', () => {
        onSelectTeam(team.TeamId);
      });

      // Draggable: update team location on drag end
      if (isSelected) {
        marker.on('dragend', (e: any) => {
          const newPos = e.target.getLatLng();
          if (onUpdateTeamLocation) {
            onUpdateTeamLocation(team.TeamId, newPos.lat, newPos.lng);
          }
        });
      }

      marker.bindPopup(`
        <div style="padding: 2px; min-width: 200px; font-family: 'Inter', sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 6px;">
            <div style="font-weight: 700; font-size: 12px; color: #38bdf8;">👥 ${team.TeamName}</div>
            <span style="font-size: 10px; background: #0284c7; color: white; padding: 1px 5px; font-weight: 700;">
              ${countForTeam} Görev
            </span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px; line-height: 1.4;">
            <div><b>Ekip Kodu:</b> #${team.TeamId}</div>
            <div><b>Konum:</b> ${team.Latitude.toFixed(4)}, ${team.Longitude.toFixed(4)}</div>
            ${isSelected ? '<div style="color: #38bdf8; font-size: 10px; margin-top: 2px;">💡 Konumu değiştirmek için sürükleyip bırakın</div>' : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${!isSelected ? `
              <button id="btn-select-team-${team.TeamId}" style="
                width: 100%;
                background: #0284c7;
                color: white;
                border: none;
                padding: 5px 8px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
              ">
                Bu Ekibi Seç ve İşlerini Göster
              </button>
            ` : ''}
            <button id="btn-team-nearest-${team.TeamId}" style="
              width: 100%;
              background: #1e293b;
              color: #f8fafc;
              border: 1px solid #334155;
              padding: 5px 8px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
            ">
              🧭 En Yakın Göreve Rota Çiz
            </button>
            ${onUpdateTeamLocation ? `
              <button id="btn-edit-coords-${team.TeamId}" style="
                width: 100%;
                background: #0b1329;
                color: #38bdf8;
                border: 1px dashed #0284c7;
                padding: 4px 8px;
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 2px;
              ">
                📍 Konum / Koordinat Düzenle
              </button>
            ` : ''}
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const selectBtn = document.getElementById(`btn-select-team-${team.TeamId}`);
        if (selectBtn) {
          selectBtn.onclick = () => onSelectTeam(team.TeamId);
        }
        const nearestBtn = document.getElementById(`btn-team-nearest-${team.TeamId}`);
        if (nearestBtn) {
          nearestBtn.onclick = () => {
            onSelectTeam(team.TeamId);
            onFindNearest();
          };
        }
        const editCoordsBtn = document.getElementById(`btn-edit-coords-${team.TeamId}`);
        if (editCoordsBtn && onUpdateTeamLocation) {
          editCoordsBtn.onclick = () => {
            const latStr = window.prompt(`[${team.TeamName}] Yeni Enlem (Latitude):`, String(team.Latitude));
            if (latStr === null) return;
            const lngStr = window.prompt(`[${team.TeamName}] Yeni Boylam (Longitude):`, String(team.Longitude));
            if (lngStr === null) return;
            const newLat = parseFloat(latStr);
            const newLng = parseFloat(lngStr);
            if (!isNaN(newLat) && !isNaN(newLng)) {
              onUpdateTeamLocation(team.TeamId, newLat, newLng);
            } else {
              window.alert('Geçersiz koordinat değeri girdiniz.');
            }
          };
        }
      });

      marker.addTo(markersLayer);
      bounds.extend([team.Latitude, team.Longitude]);
    });

    // 2. Render Task Markers ONLY for selected team's filtered tasks - Flat sharp rectangular badge
    const now = new Date();
    visibleTasks.forEach((task, index) => {
      const end = new Date(task.EndTime);
      const remainingDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = remainingDays < 0 && task.Status !== 'Completed';
      const isDueSoon = remainingDays >= 0 && remainingDays <= (task.NotificationBeforeDays || 2) && task.Status !== 'Completed';
      const isCompleted = task.Status === 'Completed';

      let statusColor = '#0284c7';
      let statusText = 'Planlı';

      if (isCompleted) {
        statusColor = '#16a34a';
        statusText = 'Tamamlandı';
      } else if (isOverdue) {
        statusColor = '#dc2626';
        statusText = 'Gecikmiş';
      } else if (isDueSoon) {
        statusColor = '#d97706';
        statusText = 'Yaklaşan';
      }

      const taskIcon = L.divIcon({
        className: 'corporate-task-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="
              background: ${statusColor};
              color: white;
              border: 1px solid #ffffff;
              padding: 2px 5px;
              font-family: 'Inter', sans-serif;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>#${index + 1}</span>
              <span>${task.HizmetNo || task.TaskId}</span>
              ${isOverdue ? `<span style="background: #ffffff; color: #dc2626; padding: 0 3px; font-weight: 800;">${remainingDays}g</span>` : ''}
            </div>
          </div>
        `,
        iconSize: [80, 22],
        iconAnchor: [40, 11]
      });

      const marker = L.marker([task.Latitude, task.Longitude], { 
        icon: taskIcon,
        zIndexOffset: isOverdue ? 600 : 400
      });

      marker.bindPopup(`
        <div style="padding: 2px; min-width: 250px; font-family: 'Inter', sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 6px;">
            <div>
              <span style="font-weight: 800; font-size: 12px; color: #38bdf8;">#${task.TaskId}</span>
              ${task.HizmetNo ? `<span style="font-size: 11px; color: #94a3b8; margin-left: 6px;">Hzm: <b>${task.HizmetNo}</b></span>` : ''}
            </div>
            <span style="
              font-size: 10px;
              padding: 1px 5px;
              background: ${statusColor};
              color: white;
              font-weight: 700;
            ">
              ${statusText}
            </span>
          </div>

          <div style="font-weight: 600; font-size: 11px; color: #f8fafc; margin-bottom: 6px;">
            ${task.TaskType}
          </div>

          <div style="
            background: #0b0f19;
            padding: 6px;
            font-size: 11px;
            color: #cbd5e1;
            display: flex;
            flex-direction: column;
            gap: 3px;
            margin-bottom: 8px;
            border: 1px solid #1f293d;
          ">
            <div>👥 <b>Ekip:</b> ${task.TeamName || task.TeamId || 'Atanmamış'}</div>
            ${task.Santral || task.Amirlik ? `<div>🏢 <b>Santral/Amirlik:</b> ${task.Santral || task.Amirlik}</div>` : ''}
            ${task.HizmetAdresi ? `<div>📍 <b>Adres:</b> <span style="color: #e2e8f0;">${task.HizmetAdresi}</span></div>` : ''}
            <div>⏱️ <b>Planlanan:</b> ${task.DurationDays} Gün (${task.StartTime.slice(0, 10)} → ${task.EndTime.slice(0, 10)})</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px; padding-top: 3px; border-top: 1px solid #1f293d;">
              <span>⏳ <b>Kalan Süre:</b></span>
              <span style="
                font-weight: 800;
                color: ${isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : '#10b981'};
              ">
                ${isOverdue ? `${remainingDays} Gün (Gecikmiş!)` : `${remainingDays} Gün`}
              </span>
            </div>
          </div>

          <div style="display: flex; gap: 6px;">
            <button id="btn-route-task-${task.TaskId}" style="
              flex: 1;
              background: #0284c7;
              color: white;
              border: none;
              padding: 5px 8px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
            ">
              🚗 OSRM Rotası Çiz
            </button>
            <button id="btn-edit-task-${task.TaskId}" style="
              background: #1e293b;
              color: #e2e8f0;
              border: 1px solid #334155;
              padding: 5px 8px;
              font-size: 11px;
              cursor: pointer;
            " title="Planlama Parametrelerini Düzenle">
              ✏️ Düzenle
            </button>
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const routeBtn = document.getElementById(`btn-route-task-${task.TaskId}`);
        if (routeBtn) {
          routeBtn.onclick = () => {
            const teamIdToUse = selectedTeamId || task.TeamId || teams[0]?.TeamId;
            if (teamIdToUse) {
              onDrawRoute(teamIdToUse, task.TaskId);
            }
          };
        }

        const editBtn = document.getElementById(`btn-edit-task-${task.TaskId}`);
        if (editBtn) {
          editBtn.onclick = () => {
            onEditTask(task);
          };
        }
      });

      marker.addTo(markersLayer);
      bounds.extend([task.Latitude, task.Longitude]);
    });

    // Auto-fit bounds
    if (bounds.isValid() && (!activeRoute)) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [teams, tasks, visibleTasks, selectedTeamId]);

  // Update Route Layer whenever activeRoute changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (activeRoute && activeRoute.geometry) {
      const geojsonLayer = L.geoJSON(activeRoute.geometry as any, {
        style: {
          color: '#0284c7',
          weight: 4,
          opacity: 0.95,
          dashArray: activeRoute.source === 'fallback' ? '6, 6' : undefined
        }
      }).addTo(map);

      routeLayerRef.current = geojsonLayer;

      const routeBounds = geojsonLayer.getBounds();
      if (routeBounds.isValid()) {
        map.fitBounds(routeBounds, { padding: [50, 50] });
      }
    }
  }, [activeRoute]);

  const handleResetFilters = () => {
    setSelectedTaskTypes(new Set(availableTaskTypes));
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters = 
    (availableTaskTypes.length > 0 && selectedTaskTypes.size < availableTaskTypes.length) || 
    selectedStatus !== 'ALL' || 
    searchQuery.trim() !== '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* 1. Flat Enterprise Control Bar */}
      <div 
        className="panel" 
        style={{ 
          padding: '6px 10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: 8,
          background: '#0d131f'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {/* Team Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} style={{ color: '#38bdf8' }} />
            <select
              value={selectedTeamId}
              onChange={(e) => onSelectTeam(e.target.value)}
              className="form-input"
              style={{ 
                minWidth: 190, 
                padding: '4px 8px', 
                fontSize: '0.8rem',
                borderColor: selectedTeamId ? '#0284c7' : '#334155'
              }}
            >
              <option value="">-- Ekip Seçiniz (İşleri Göster) --</option>
              {teams.map(t => {
                const count = tasks.filter(x => x.TeamId === t.TeamId).length;
                return (
                  <option key={t.TeamId} value={t.TeamId}>
                    {t.TeamName} ({count} İş)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Task Type MultiSelect Checklist (All Checked by Default) */}
          {selectedTeamId && availableTaskTypes.length > 0 && (
            <MultiSelectFilter
              title="İş Tipi"
              icon={<Briefcase size={12} style={{ color: '#818cf8' }} />}
              options={availableTaskTypes.map(type => ({
                value: type,
                label: type,
                count: teamTasks.filter(t => (t.TaskType || '').trim() === type).length
              }))}
              selectedValues={selectedTaskTypes}
              onChange={setSelectedTaskTypes}
              placeholder="İş tipi ara..."
            />
          )}

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={14} style={{ color: selectedTeamId ? '#94a3b8' : '#475569' }} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={!selectedTeamId}
              className="form-input"
              style={{ 
                minWidth: 140, 
                padding: '4px 8px', 
                fontSize: '0.8rem',
                opacity: selectedTeamId ? 1 : 0.4
              }}
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="OVERDUE">🔴 Gecikmiş ({teamStatusCounts.overdue})</option>
              <option value="DUE_SOON">🟡 Yaklaşan ({teamStatusCounts.dueSoon})</option>
              <option value="IN_PROGRESS">🔵 Normal ({teamStatusCounts.inProgress})</option>
              <option value="COMPLETED">🟢 Tamamlanan ({teamStatusCounts.completed})</option>
            </select>
          </div>

          {/* Search Box */}
          {selectedTeamId && (
            <div style={{ position: 'relative', width: 170 }}>
              <Search size={13} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Hzm / Adres ara..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 24, paddingRight: 6, paddingTop: 4, paddingBottom: 4, fontSize: '0.78rem' }}
              />
            </div>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="btn btn-outline"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              title="Filtreleri Temizle"
            >
              <RotateCcw size={11} /> Sıfırla
            </button>
          )}
        </div>

        {/* Right Side Actions & Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedTeamId ? (
            <>
              <button
                onClick={onFindNearest}
                className="btn btn-primary"
                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              >
                <Navigation size={13} /> En Yakın Göreve Rota
              </button>

              <span style={{
                fontSize: '0.75rem',
                background: '#0b0f19',
                color: '#38bdf8',
                padding: '3px 8px',
                fontWeight: 700,
                border: '1px solid #1f293d'
              }}>
                {visibleTasks.length} / {teamTasks.length} Görev
              </span>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={13} /> Haritada işler için ekip seçiniz
            </span>
          )}
        </div>
      </div>

      {/* 2. Flat Map Container - Maximized Height */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: 'calc(100vh - 165px)', 
        minHeight: 500, 
        border: '1px solid #1f293d'
      }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* 3. Empty State Prompt Overlay - Flat Enterprise */}
        {!selectedTeamId && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              background: '#0d131f',
              border: '1px solid #0284c7',
              padding: '16px 20px',
              maxWidth: 540,
              width: '90%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              background: '#0284c7',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px'
            }}>
              <Users size={18} />
            </div>

            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>
              Saha Ekibi Seçiniz
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: 12 }}>
              Haritada iş emirlerini, adres konumlarını ve OSRM sürüş rotalarını görüntülemek için lütfen bir ekip seçin.
            </div>

            {/* Quick Clickable Team Chips - Flat Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
              gap: 6,
              maxHeight: 220,
              overflowY: 'auto'
            }}>
              {teams.map(t => {
                const count = tasks.filter(x => x.TeamId === t.TeamId).length;
                return (
                  <button
                    key={t.TeamId}
                    onClick={() => onSelectTeam(t.TeamId)}
                    style={{
                      background: '#111827',
                      border: '1px solid #334155',
                      padding: '6px 8px',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#38bdf8' }}>
                      {t.TeamName}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {count} İş Emri
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Active Route Status Banner - Flat */}
        {activeRoute && (
          <div
            className="panel-elevated"
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 1000,
              padding: '8px 12px',
              maxWidth: 340,
              border: '1px solid #0284c7',
              background: '#0d131f'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontWeight: 700, fontSize: '0.8rem' }}>
                <RouteIcon size={14} />
                <span>OSRM Sürüş Rotası</span>
              </div>
              <button
                onClick={onClearRoute}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                title="Rotayı Kapat"
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#f8fafc', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <b>{activeRoute.team.TeamName}</b>
              <ArrowRight size={12} style={{ color: '#0284c7' }} />
              <b>#{activeRoute.task.TaskId}</b>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ({activeRoute.task.TaskType})
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: '#94a3b8', background: '#0b0f19', padding: '4px 8px', border: '1px solid #1f293d' }}>
              <div>
                Mesafe: <b style={{ color: '#f8fafc' }}>{activeRoute.distanceKm} km</b>
              </div>
              <div>
                Tahmini: <b style={{ color: '#38bdf8' }}>~{activeRoute.durationMinutes} dk</b>
              </div>
            </div>
          </div>
        )}

        {/* 5. Flat Corporate Legend */}
        <div
          className="panel"
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            zIndex: 1000,
            padding: '4px 8px',
            fontSize: '0.7rem',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: '#0d131f',
            border: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, background: '#0284c7' }} />
            <span>Ekip</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, background: '#dc2626' }} />
            <span>Gecikmiş</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, background: '#d97706' }} />
            <span>Yaklaşan</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, background: '#0284c7' }} />
            <span>Normal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, background: '#16a34a' }} />
            <span>Tamamlandı</span>
          </div>
        </div>
      </div>
    </div>
  );
};
