# Web-Tabanlı Gantt ve Harita Uygulaması (GeoGantt)

Docker gerektirmeyen, **Node.js + Express + SQLite** arka uçlu ve **React + TypeScript + Leaflet** ön yüzlü, OSRM rota optimizasyonu ve bildirim destekli operasyonel yönetim sistemi.

---

## 🌟 Temel Özellikler

1. **Excel → SQLite Entegrasyonu**:
   - `xlsx` modülü ile Teams ve Tasks tabloları okunur, doğrudan `gantt_geo.db` SQLite veritabanına aktarılır.
   - CLI scripti (`npm run import`) ve Web arayüzü üzerinden sürükle-bırak Excel yükleme desteği.
2. **Veri Modeli**:
   - **Teams**: `TeamId`, `TeamName`, `Latitude`, `Longitude` (veya Hizmet Adresi).
   - **Tasks**: `TaskId`, `TaskType`, `DurationDays`, `StartTime`, `EndTime`, `Latitude`, `Longitude`, `TeamId`, `Status`, `NotificationBeforeDays`.
3. **OSRM & Haversine Entegrasyonu**:
   - Haversine formülü ile ekipten en yakın görevi tespit etme (`GET /nearest/:teamId`).
   - OSRM gerçek karayolu ağı üzerinden dönüşlü optimal rota ve GeoJSON polylines çizimi (`GET /route/:teamId/:taskId`).
4. **Zengin Görsel Arayüz (React + TS)**:
   - **Harita (`MapView.tsx`)**: Leaflet pinleri (ekipler mavi, geciken görevler kırmızı animasyonlu, yaklaşanlar turuncu, tamamlananlar yeşil), rota göstergesi, popup'lar.
   - **Gantt (`GanttView.tsx`)**: Ekiplere göre gruplanmış görev zaman çizelgesi, süreler (`DurationDays`), kalan günler ve gecikme uyarıları.
   - **Görev Tablosu (`TaskTable.tsx`)**: Kalan gün sayısı (`RemainingDays`) hesaplanır; negatif ise satırda kırmızı uyarı rozetiyle vurgulanır.
5. **Masaüstü Bildirimleri**:
   - `node-cron` periyodik olarak süresi yaklaşan (`EndTime - NotificationBeforeDays`) veya geçen görevleri sorgular ve `node-notifier` ile Windows masaüstü bildirimi gönderir.
6. **Manuel Süre & Bildirim Girişi**:
   - Görev düzenleme modalında `Duration (days)` ve `Notify X days before` sayı alanları bulunur; `PUT /tasks/:id` ile anında güncellenir.

---

## 🚀 Hızlı Başlangıç (PowerShell / Windows)

### 1. Bağımlılıkları Kurma
```powershell
npm install
cd client; npm install; cd ..
```

### 2. Örnek Excel Dosyası Oluşturma (İsteğe Bağlı)
Gerçek koordinatlara ve görevlere sahip örnek bir `gantt_data.xlsx` oluşturmak için:
```powershell
npm run generate-sample
```

### 3. Excel Verisini SQLite'a Aktarma
```powershell
# Varsayılan dosya (gantt_data.xlsx) veya istediğiniz bir dosya yoluyla:
node scripts\import_excel.js C:\Users\00735211\Downloads\ttgant\gantt_data.xlsx
```

### 4. Geliştirme Sunucusunu Başlatma
Hem Express API sunucusunu (port 5000) hem de React ön yüzünü (port 3000) aynı anda başlatır:
```powershell
npm run dev
```

### 5. Tarayıcıda Açma
```powershell
Start-Process "http://localhost:3000"
```

---

## 📡 API Uç Noktaları

| Metot | Uç Nokta | Açıklama |
|---|---|---|
| `GET` | `/teams` | Tüm ekipleri listeler |
| `GET` | `/tasks` | Tüm görevleri listeler |
| `GET` | `/team/:id/tasks` | Belirtilen ekibe atanmış görevleri döner |
| `GET` | `/nearest/:teamId` | Ekipten en yakın görevi (Haversine) döner |
| `GET` | `/route/:teamId/:taskId` | OSRM karayolu optimal rotasını (GeoJSON) döner |
| `PUT` | `/tasks/:id` | Görev süresini, bildirim eşiğini, durumunu günceller |
| `POST` | `/upload-excel` | Excel dosyasını veritabanına aktarır |
| `GET` | `/notifications` | Cron bildirim ve uyarı geçmişini döner |
| `POST` | `/notifications/trigger` | Bildirim kontrolünü manuel tetikler |

---

## 🛠️ Proje Dizin Yapısı

```
ttgant/
├── .env                     # Yapılandırma ortam değişkenleri
├── .env.example             # Örnek ortam şablonu
├── gantt_geo.db             # SQLite veritabanı dosyası
├── gantt_data.xlsx          # Örnek Excel veri dosyası
├── package.json             # Kök bağımlılıklar ve dev betikleri
├── scripts/
│   ├── generate_sample_excel.js  # Örnek Excel üretici
│   └── import_excel.js           # CLI Excel import aracı
├── server/
│   ├── index.js             # Express API sunucusu
│   ├── db.js                # SQLite (Node:sqlite) veritabanı sürücüsü
│   ├── osrm.js              # Haversine mesafe & OSRM rota motoru
│   ├── cron.js              # node-cron & node-notifier servisi
│   └── excelParser.js       # Excel (xlsx) ayrıştırıcı
└── client/
    ├── index.html           # Giriş HTML şablonu (Leaflet & Fonts)
    ├── vite.config.ts       # Vite yapılandırması (Port 3000 & Proxy)
    └── src/
        ├── App.tsx          # Ana React uygulaması
        ├── api.ts           # REST API istemcisi
        ├── types.ts         # TypeScript tipleri
        ├── index.css        # Modern koyu tema & glassmorphism stilleri
        └── components/
            ├── Navbar.tsx           # Üst gezinme çubuğu & bildirimler
            ├── StatsOverview.tsx    # İstatistik kartları (Geciken görev uyarısı)
            ├── MapView.tsx          # Leaflet harita & OSRM rota katmanı
            ├── GanttView.tsx        # İnteraktif Gantt zaman çizelgesi
            ├── TaskTable.tsx        # Görev tablosu (Kırmızı RemainingDays rozeti)
            ├── TaskEditModal.tsx    # Manuel süre & bildirim düzenleme formu
            └── ExcelUploadModal.tsx # Web üzerinden Excel yükleme penceresi
```
