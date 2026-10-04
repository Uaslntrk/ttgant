import { Team, Task, RouteResponse, NearestResponse, NotificationItem, AvailableExcelFile, CompletedTask } from './types';

const API_BASE = ''; // Uses Vite proxy in dev

export async function getTeams(): Promise<Team[]> {
  try {
    const res = await fetch(`${API_BASE}/teams`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getTasks(): Promise<Task[]> {
  try {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getTeamTasks(teamId: string): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/team/${encodeURIComponent(teamId)}/tasks`);
  if (!res.ok) throw new Error('Ekip görevleri yüklenemedi');
  return res.json();
}

export async function getNearestTask(teamId: string): Promise<NearestResponse> {
  const res = await fetch(`${API_BASE}/nearest/${encodeURIComponent(teamId)}`);
  if (!res.ok) throw new Error('En yakın görev hesaplanamadı');
  return res.json();
}

export async function getRoute(teamId: string, taskId: string): Promise<RouteResponse> {
  const res = await fetch(`${API_BASE}/route/${encodeURIComponent(teamId)}/${encodeURIComponent(taskId)}`);
  if (!res.ok) throw new Error('Rota hesaplanamadı');
  return res.json();
}

/**
 * KURAL 1: Sadece DurationDays ve NotificationBeforeDays gönderilir.
 */
export async function updateTask(taskId: string, data: { DurationDays?: number; NotificationBeforeDays?: number }): Promise<{ success: boolean; message: string; task: Task }> {
  const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Görev güncellenemedi');
  }
  return res.json();
}

/**
 * KURAL 2: Güvenlik sistemini tetiklemeyen doğrudan disk yoluyla içe aktarım
 */
export async function importLocalPath(filePath: string, clearExisting = true, autoHattatSync = true): Promise<any> {
  const res = await fetch(`${API_BASE}/api/import-path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, clearExisting, autoHattatSync })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Dosya içe aktarılamadı');
  }
  return res.json();
}

/**
 * KURAL 2: Güvenlik sistemini tetiklemeyen Pano / Kopyala-Yapıştır ile içe aktarım
 */
export async function importClipboardText(rawText: string, clearExisting = true, autoHattatSync = true): Promise<any> {
  const res = await fetch(`${API_BASE}/api/import-clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, clearExisting, autoHattatSync })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Kopyalanan veri içe aktarılamadı');
  }
  return res.json();
}

/**
 * Mevcut Excel dosyalarını listeleme
 */
export async function getAvailableExcelFiles(): Promise<AvailableExcelFile[]> {
  const res = await fetch(`${API_BASE}/api/available-excel-files`);
  if (!res.ok) return [];
  return res.json();
}

/**
 * Standart multipart upload
 */
export async function uploadExcelFile(file: File, clearExisting = true, autoHattatSync = true): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clearExisting', String(clearExisting));
  formData.append('autoHattatSync', String(autoHattatSync));

  const res = await fetch(`${API_BASE}/upload-excel`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Excel dosyası yüklenemedi');
  }
  return res.json();
}

/**
 * KURAL 2: Güvenlik-dostu Base64 yükleme – multipart upload'ı TAMAMEN atlar
 * Dosyayı tarayıcıda base64'e çevirip JSON olarak gönderir
 */
export async function importBase64(file: File, clearExisting = true, autoHattatSync = true): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch(`${API_BASE}/api/import-base64`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: base64Data,
            fileName: file.name,
            clearExisting,
            autoHattatSync
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Base64 yükleme başarısız');
        }
        resolve(await res.json());
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE}/notifications`);
  if (!res.ok) return [];
  return res.json();
}

export async function triggerNotificationCheck(): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/trigger`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Bildirim kontrolü başarısız');
  return res.json();
}

/**
 * YAPILAN İŞLER (COMPLETED TASKS) API İŞLEMLERİ
 */
export async function getCompletedTasks(): Promise<CompletedTask[]> {
  const res = await fetch(`${API_BASE}/api/completed-tasks`);
  if (!res.ok) return [];
  return res.json();
}

export async function importCompletedPath(filePath: string, clearExisting = true): Promise<any> {
  const res = await fetch(`${API_BASE}/api/completed/import-path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, clearExisting })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Yapılan işler dosyası içe aktarılamadı');
  }
  return res.json();
}

export async function importCompletedClipboard(rawText: string, clearExisting = true): Promise<any> {
  const res = await fetch(`${API_BASE}/api/completed/import-clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, clearExisting })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Pano verisi içe aktarılamadı');
  }
  return res.json();
}

export async function uploadCompletedExcel(file: File, clearExisting = true): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clearExisting', String(clearExisting));

  const res = await fetch(`${API_BASE}/api/completed/upload-excel`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Yapılan işler dosyası yüklenemedi');
  }
  return res.json();
}

export async function clearCompletedTasks(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/completed-tasks`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Yapılan işler temizlenemedi');
  return res.json();
}

/**
 * HATTAT BBK API ENTEGRASYONU
 */
export async function syncHattatAddresses(onlyMissing = true): Promise<any> {
  const res = await fetch(`${API_BASE}/api/hattat/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ onlyMissing })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Hattat senkronizasyonu başlatılamadı');
  }
  return res.json();
}

export async function getHattatStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/hattat/status`);
  if (!res.ok) return null;
  return res.json();
}

export async function querySingleBbk(bbk: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/hattat/query-single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbk })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'BBK sorgulanamadı');
  }
  return res.json();
}
