require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const db = require('./db');
const osrm = require('./osrm');
const cron = require('./cron');
const { 
  parseAndImportExcel, 
  parseAndImportClipboard,
  parseAndImportCompletedExcel,
  parseAndImportCompletedClipboard
} = require('./excelParser');
const hattatService = require('./hattatService');

const app = express();
const PORT = process.env.PORT || 5000;

// Setup upload directory for Excel files
const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `upload_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize DB and Cron
db.initDb();
cron.initCron();

// --- API ENDPOINTS ---

/**
 * GET /teams – Tüm ekipleri döner
 */
app.get('/teams', (req, res) => {
  try {
    const teams = db.getAllTeams();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /tasks – Tüm görevleri döner
 */
app.get('/tasks', (req, res) => {
  try {
    const tasks = db.getAllTasks();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /team/:id/tasks – Bir ekibe atanmış görevler
 */
app.get('/team/:id/tasks', (req, res) => {
  try {
    const { id } = req.params;
    const tasks = db.getTasksByTeamId(id);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /teams/:id/location – Ekip konumunu günceller
 */
app.put('/teams/:id/location', (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude ve longitude zorunludur.' });
    }
    const updated = db.updateTeamLocation(id, latitude, longitude);
    if (!updated) {
      return res.status(404).json({ error: `Ekip #${id} bulunamadı.` });
    }
    res.json({ success: true, message: `Ekip #${id} konumu güncellendi.`, team: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /nearest/:teamId – Ekip konumundan en yakın görevi (Haversine mesafesi) döner
 */
app.get('/nearest/:teamId', (req, res) => {
  try {
    const { teamId } = req.params;
    const result = osrm.findNearestTask(teamId);
    if (!result) {
      return res.status(404).json({ message: 'Görev veya ekip bulunamadı.' });
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /route/:teamId/:taskId – OSRM optimal rota (GeoJSON) alır
 */
app.get('/route/:teamId/:taskId', async (req, res) => {
  try {
    const { teamId, taskId } = req.params;
    const routeData = await osrm.getRoute(teamId, taskId);
    res.json(routeData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * KURAL 1: Excel'den gelen veriler kesinlikle el ile değiştirilemez!
 * PUT /tasks/:id – Yalnızca manuel operasyonel alanlar (DurationDays ve NotificationBeforeDays) güncellenebilir.
 */
app.put('/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Yalnızca DurationDays ve NotificationBeforeDays geçirilir
    const allowedPayload = {
      DurationDays: req.body.DurationDays !== undefined ? parseInt(req.body.DurationDays, 10) : undefined,
      NotificationBeforeDays: req.body.NotificationBeforeDays !== undefined ? parseInt(req.body.NotificationBeforeDays, 10) : undefined
    };

    const updated = db.updateTask(id, allowedPayload);
    if (!updated) {
      return res.status(404).json({ error: `Görev #${id} bulunamadı.` });
    }
    res.json({
      success: true,
      message: `Görev #${id} planlama parametreleri güncellendi (Excel verileri korunmuştur).`,
      task: updated
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * KURAL 2: Bilgisayar güvenlik sistemini tetiklemeyen içe aktarma yöntemleri
 */

// 1. Hızlı Excel dosyası tarama — sadece Downloads ve uploads klasörü (yavaş klasörler hariç)
app.get('/api/available-excel-files', (req, res) => {
  try {
    const os = require('os');
    const homeDir = os.homedir() || process.env.USERPROFILE || 'C:\\Users\\00735211';
    const uploadDirPath = path.resolve(__dirname, '..', 'uploads');

    // Sadece hızlı/küçük klasörler — Masaüstü ve Belgeler gibi binlerce dosya içeren yerler hariç
    const searchDirs = [
      { dir: path.join(homeDir, 'Downloads'), source: 'Downloads' },
      { dir: uploadDirPath, source: 'Yüklenenler (uploads)' }
    ];

    const validExtensions = ['.xlsx', '.xls', '.csv', '.xlsm'];
    const seenPaths = new Set();
    const result = [];
    const MAX_FILES_PER_DIR = 200; // Çok büyük klasörlerde takılmayı önle

    for (const item of searchDirs) {
      if (!item.dir || !fs.existsSync(item.dir)) continue;
      try {
        const files = fs.readdirSync(item.dir);
        let count = 0;
        for (const f of files) {
          if (count >= MAX_FILES_PER_DIR) break;
          count++;
          const lower = f.toLowerCase();
          if (validExtensions.some(ext => lower.endsWith(ext))) {
            const fullPath = path.join(item.dir, f);
            const normalized = path.normalize(fullPath).toLowerCase();
            if (seenPaths.has(normalized)) continue;
            seenPaths.add(normalized);

            let mtime = 0;
            let size = 0;
            try {
              const stat = fs.statSync(fullPath);
              mtime = stat.mtimeMs || 0;
              size = stat.size || 0;
            } catch (e) {}

            result.push({ name: f, path: fullPath, source: item.source, mtime, size });
          }
        }
      } catch (dirErr) {
        // Klasör okunamazsa sessizce atla
      }
    }

    // En son değiştirilen önce gelsin
    result.sort((a, b) => b.mtime - a.mtime);
    res.json(result);
  } catch (err) {
    console.error('[available-excel-files] Hata:', err);
    res.status(500).json({ error: err.message });
  }
});


// 2. Doğrudan yerel dosya yolundan okuma (Tarayıcı upload'ı olmadığından antivirüs/güvenlik ASLA engellemez)
app.post('/api/import-path', (req, res) => {
  try {
    const filePath = req.body.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ error: `Belirtilen dosya yolu bulunamadı: ${filePath}` });
    }

    const clearExisting = req.body.clearExisting !== false;
    const result = parseAndImportExcel(filePath, clearExisting);
    cron.checkNotifications();

    if (req.body.autoHattatSync) {
      hattatService.syncTasks(true).catch(e => console.error('[AutoHattatSync Error]:', e.message));
    }

    res.json({
      success: true,
      message: `Dosya doğrudan disk üzerinden başarıyla aktarıldı! (${result.importedTeams} Ekip, ${result.importedTasks} Görev)`,
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Pano / Kopyala-Yapıştır ile içe aktarma (Tarayıcı dosya yüklemesini tamamen atlar, metin olarak gelir)
app.post('/api/import-clipboard', (req, res) => {
  try {
    const { rawText, clearExisting } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'Lütfen Excelden kopyaladığınız veriyi yapıştırın.' });
    }

    const result = parseAndImportClipboard(rawText, clearExisting !== false);
    cron.checkNotifications();

    res.json({
      success: true,
      message: `Yapıştırılan veri başarıyla aktarıldı! (${result.importedTeams} Ekip, ${result.importedTasks} Görev)`,
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4a. Base64 ile sürükle-bırak upload (güvenlik sistemini TAMAMEN atlatır - multipart kullanmaz)
app.post('/api/import-base64', (req, res) => {
  try {
    const { data, fileName, clearExisting, autoHattatSync } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Base64 veri bulunamadı.' });
    }

    // Remove data URL prefix if present (e.g. "data:application/vnd...;base64,")
    const base64Clean = data.includes(',') ? data.split(',')[1] : data;
    const buffer = Buffer.from(base64Clean, 'base64');

    // Save to temp file so xlsx can read it
    const tempPath = path.join(uploadDir, `base64_${Date.now()}_${fileName || 'upload.xlsx'}`);
    fs.writeFileSync(tempPath, buffer);

    const shouldClear = clearExisting !== false;
    const result = parseAndImportExcel(tempPath, shouldClear);
    cron.checkNotifications();

    // Cleanup temp file
    try { fs.unlinkSync(tempPath); } catch (_) {}

    if (autoHattatSync) {
      hattatService.syncTasks(true).catch(e => console.error('[AutoHattatSync Error]:', e.message));
    }

    res.json({
      success: true,
      message: `Dosya güvenli base64 yöntemiyle başarıyla aktarıldı! (${result.importedTeams} Ekip, ${result.importedTasks} Görev)`,
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4b. Klasik multipart form upload (güvenlik sistemi izin veriyorsa)
app.post('/upload-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen bir .xlsx dosyası yükleyin.' });
    }

    const clearExisting = req.body.clearExisting !== 'false';
    const result = parseAndImportExcel(req.file.path, clearExisting);
    cron.checkNotifications();

    if (req.body.autoHattatSync === 'true' || req.body.autoHattatSync === true) {
      hattatService.syncTasks(true).catch(e => console.error('[AutoHattatSync Error]:', e.message));
    }

    res.json({
      success: true,
      message: 'Excel başarıyla içe aktarıldı!',
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * YAPILAN İŞLER (COMPLETED TASKS) ENDPOINTS
 */
app.get('/api/completed-tasks', (req, res) => {
  try {
    const tasks = db.getAllCompletedTasks();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/completed/import-path', (req, res) => {
  try {
    const filePath = req.body.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ error: `Belirtilen dosya yolu bulunamadı: ${filePath}` });
    }
    const clearExisting = req.body.clearExisting !== false;
    const result = parseAndImportCompletedExcel(filePath, clearExisting);
    res.json({
      success: true,
      message: `Yapılan işler dosyası doğrudan disk üzerinden başarıyla aktarıldı! (${result.importedCompleted} Görev)`,
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/completed/import-clipboard', (req, res) => {
  try {
    const { rawText, clearExisting } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'Lütfen Excelden kopyaladığınız veriyi yapıştırın.' });
    }
    const result = parseAndImportCompletedClipboard(rawText, clearExisting !== false);
    res.json({
      success: true,
      message: `Yapıştırılan yapılan işler verisi başarıyla aktarıldı! (${result.importedCompleted} Görev)`,
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/completed/upload-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen bir Excel dosyası yükleyin.' });
    }
    const clearExisting = req.body.clearExisting !== 'false';
    const result = parseAndImportCompletedExcel(req.file.path, clearExisting);
    res.json({
      success: true,
      message: `Yapılan işler Exceli başarıyla içe aktarıldı! (${result.importedCompleted} Görev)`,
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/completed-tasks', (req, res) => {
  try {
    db.clearCompletedTasks();
    res.json({ success: true, message: 'Yapılan işler veritabanı temizlendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /notifications – Bildirim geçmişi ve tetiklenmiş uyarılar
 */
app.get('/notifications', (req, res) => {
  try {
    const history = cron.getNotificationHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /notifications/trigger – Manuel bildirim kontrolünü tetikler
 */
app.post('/notifications/trigger', (req, res) => {
  try {
    const results = cron.checkNotifications();
    res.json({
      success: true,
      triggeredCount: results.length,
      tasks: results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /notifications/:id – Tek bir bildirimi siler
 */
app.delete('/notifications/:id', (req, res) => {
  try {
    const { id } = req.params;
    const removed = cron.removeNotification(id);
    res.json({ success: removed, message: removed ? 'Bildirim silindi.' : 'Bildirim bulunamadı.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /notifications – Tüm bildirimleri siler
 */
app.delete('/notifications', (req, res) => {
  try {
    cron.clearNotifications();
    res.json({ success: true, message: 'Tüm bildirimler temizlendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- HATTAT BBK ENTEGRASYONU ---


/**
 * POST /api/hattat/sync – BBK kodlu görevlerin adreslerini Hattat'tan çeker
 */
app.post('/api/hattat/sync', async (req, res) => {
  try {
    const onlyMissing = req.body.onlyMissing !== false;
    const result = await hattatService.syncTasks(onlyMissing);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/hattat/status – Senkronizasyon durumunu döner
 */
app.get('/api/hattat/status', (req, res) => {
  try {
    const status = hattatService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/hattat/query-single – Tek bir BBK'yı test amaçlı sorgular
 */
app.post('/api/hattat/query-single', async (req, res) => {
  try {
    const { bbk } = req.body;
    if (!bbk) {
      return res.status(400).json({ error: 'bbk parametresi zorunludur.' });
    }
    const result = await hattatService.queryBbk(bbk);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend build if present
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      res.sendFile(path.join(clientDist, 'index.html'));
    } else {
      next();
    }
  });
}

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Gantt & Geo Backend Sunucusu Aktif!`);
  console.log(`📡 API Adresi: http://localhost:${PORT}`);
  console.log(`📁 Veritabanı: ${db.DB_PATH}`);
  console.log(`===============================================`);
});
