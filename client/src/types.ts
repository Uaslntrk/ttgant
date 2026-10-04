export interface Team {
  TeamId: string;
  TeamName: string;
  Amirlik?: string;
  Latitude: number;
  Longitude: number;
}

export interface Task {
  TaskId: string;
  HizmetNo?: string;
  HizmetTalebiId?: string;
  TaskType: string;
  Amirlik?: string;
  Santral?: string;
  HizmetAdresi?: string;
  BbkKodu?: string;
  DurationDays: number;
  StartTime: string;
  EndTime: string;
  Latitude: number;
  Longitude: number;
  TeamId: string | null;
  Status: string;
  NotificationBeforeDays: number;
  GecenSaat?: number;
  TeamName?: string;
  EkipAmirlik?: string;
  distanceKm?: number;
}

export interface RouteGeometry {
  type: string;
  coordinates: [number, number][]; // [lon, lat]
}

export interface RouteResponse {
  source: 'osrm' | 'fallback';
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  geometry: RouteGeometry;
  team: Team;
  task: Task;
}

export interface NearestResponse {
  team: Team;
  nearestTask: Task & { distanceKm: number };
  distanceKm: number;
}

export interface NotificationItem {
  id: string;
  taskId: string;
  taskType: string;
  teamName?: string;
  diffDays: number;
  isOverdue: boolean;
  title: string;
  message: string;
  timestamp: string;
}

export interface AvailableExcelFile {
  name: string;
  path: string;
  source: string;
  mtime?: number;
  size?: number;
}

export interface CompletedTask {
  id: number;
  IsemriId?: string;
  HizmetNo?: string;
  MusteriId?: string;
  IsemriTipi?: string;
  HizmetTuru?: string;
  AltHizmetTuru?: string;
  Lokasyon?: string;
  EkipNo?: string;
  EkipAdi?: string;
  BildirimZamani?: string;
  EkibeAtanmaZamani?: string;
  TamamlanmaZamani?: string;
  Slot?: string;
  RandevuZamani?: string;
  Durumu?: string;
  IsTuru?: string;
  SiparisKategori?: string;
  ToplamSlaSuresi?: string;
  KalanSlaSuresi?: string;
  EkipSlaSuresi?: string;
  KalanEkipSlaSuresi?: string;
  ToplamYkoSuresi?: string;
  YkoOrani?: string;
  KalanYkoSuresi?: string;
  MudurlukAmirlik?: string;
  AltyapiTipi?: string;
  SiparisBildirimTarihi?: string;
  UcCihazKurulumTipi?: string;
  RawJson?: string;
  CreatedAt?: string;
}

export interface HattatSyncStatus {
  isRunning: boolean;
  total: number;
  current: number;
  updated: number;
  failed: number;
  currentBbk: string;
  message: string;
  isSessionActive?: boolean;
  lastLoginTime?: string;
}
