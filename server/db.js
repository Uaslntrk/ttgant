const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', 'gantt_geo.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initDb(dbInstance);
  }
  return dbInstance;
}

function initDb(db = getDb()) {
  // Create Teams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Teams (
      TeamId TEXT PRIMARY KEY,
      TeamName TEXT NOT NULL,
      Amirlik TEXT,
      Latitude REAL NOT NULL,
      Longitude REAL NOT NULL
    );
  `);

  // Ensure new columns exist in case table was created with earlier schema
  const teamCols = ['Amirlik TEXT'];
  for (const col of teamCols) {
    try { db.exec(`ALTER TABLE Teams ADD COLUMN ${col};`); } catch (e) { }
  }

  // Create Tasks table with TTNET / Operational columns
  db.exec(`
    CREATE TABLE IF NOT EXISTS Tasks (
      TaskId TEXT PRIMARY KEY,
      HizmetNo TEXT,
      HizmetTalebiId TEXT,
      TaskType TEXT,
      Amirlik TEXT,
      Santral TEXT,
      HizmetAdresi TEXT,
      BbkKodu TEXT,
      DurationDays INTEGER DEFAULT 1,
      StartTime TEXT NOT NULL,
      EndTime TEXT NOT NULL,
      Latitude REAL NOT NULL,
      Longitude REAL NOT NULL,
      TeamId TEXT,
      Status TEXT DEFAULT 'In Progress',
      NotificationBeforeDays INTEGER DEFAULT 2,
      GecenSaat REAL DEFAULT 0,
      FOREIGN KEY (TeamId) REFERENCES Teams(TeamId) ON DELETE SET NULL
    );
  `);

  const taskCols = [
    'HizmetNo TEXT',
    'HizmetTalebiId TEXT',
    'Amirlik TEXT',
    'Santral TEXT',
    'HizmetAdresi TEXT',
    'BbkKodu TEXT',
    'GecenSaat REAL DEFAULT 0'
  ];
  for (const col of taskCols) {
    try { db.exec(`ALTER TABLE Tasks ADD COLUMN ${col};`); } catch (e) { }
  }

  // Create indices for fast lookup
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_team ON Tasks(TeamId);
    CREATE INDEX IF NOT EXISTS idx_tasks_endtime ON Tasks(EndTime);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON Tasks(Status);
    CREATE INDEX IF NOT EXISTS idx_tasks_bbk ON Tasks(BbkKodu);

    CREATE TABLE IF NOT EXISTS CompletedTasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      IsemriId TEXT,
      HizmetNo TEXT,
      MusteriId TEXT,
      IsemriTipi TEXT,
      HizmetTuru TEXT,
      AltHizmetTuru TEXT,
      Lokasyon TEXT,
      EkipNo TEXT,
      EkipAdi TEXT,
      BildirimZamani TEXT,
      EkibeAtanmaZamani TEXT,
      TamamlanmaZamani TEXT,
      Slot TEXT,
      RandevuZamani TEXT,
      Durumu TEXT,
      IsTuru TEXT,
      SiparisKategori TEXT,
      ToplamSlaSuresi TEXT,
      KalanSlaSuresi TEXT,
      EkipSlaSuresi TEXT,
      KalanEkipSlaSuresi TEXT,
      ToplamYkoSuresi TEXT,
      YkoOrani TEXT,
      KalanYkoSuresi TEXT,
      MudurlukAmirlik TEXT,
      AltyapiTipi TEXT,
      SiparisBildirimTarihi TEXT,
      UcCihazKurulumTipi TEXT,
      RawJson TEXT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getAllTeams() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Teams ORDER BY TeamName ASC');
  return stmt.all();
}

function getTeamById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Teams WHERE TeamId = ?');
  return stmt.get(String(id));
}

function getAllTasks() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT t.*, tm.TeamName, tm.Amirlik as EkipAmirlik
    FROM Tasks t
    LEFT JOIN Teams tm ON t.TeamId = tm.TeamId
    ORDER BY t.StartTime ASC
  `);
  return stmt.all();
}

function getTasksByTeamId(teamId) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT t.*, tm.TeamName, tm.Amirlik as EkipAmirlik
    FROM Tasks t
    LEFT JOIN Teams tm ON t.TeamId = tm.TeamId
    WHERE t.TeamId = ?
    ORDER BY t.StartTime ASC
  `);
  return stmt.all(String(teamId));
}

function getTaskById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT t.*, tm.TeamName, tm.Amirlik as EkipAmirlik
    FROM Tasks t
    LEFT JOIN Teams tm ON t.TeamId = tm.TeamId
    WHERE t.TaskId = ?
  `);
  return stmt.get(String(id));
}

/**
 * KURAL 1: Excel'den gelen hiçbir veri (İş Emri No, Başlangıç, Bitiş, Adres, Ekip, Koordinat vb.) el ile DEĞİŞTİRİLEMEZ!
 * Sadece kullanıcının manuel planlama parametreleri olan DurationDays ve NotificationBeforeDays güncellenebilir.
 */
function updateTask(id, fields) {
  const db = getDb();
  const existing = getTaskById(id);
  if (!existing) {
    return null;
  }

  // YALNIZCA manuel parametreler değiştirilebilir! Excel alanları KESİNLİKLE salt-okunurdur (read-only).
  const allowedKeys = ['DurationDays', 'NotificationBeforeDays'];

  const updates = [];
  const values = [];

  for (const key of allowedKeys) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) return existing;

  values.push(String(id));
  const query = `UPDATE Tasks SET ${updates.join(', ')} WHERE TaskId = ?`;
  db.prepare(query).run(...values);

  return getTaskById(id);
}

function insertOrReplaceTeam(team) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO Teams (TeamId, TeamName, Amirlik, Latitude, Longitude)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    String(team.TeamId),
    String(team.TeamName || 'Unnamed Team'),
    team.Amirlik ? String(team.Amirlik) : null,
    parseFloat(team.Latitude) || 0.0,
    parseFloat(team.Longitude) || 0.0
  );
}

function insertOrReplaceTask(task) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO Tasks (
      TaskId, HizmetNo, HizmetTalebiId, TaskType, Amirlik, Santral, HizmetAdresi,
      BbkKodu, DurationDays, StartTime, EndTime, Latitude, Longitude, TeamId, Status,
      NotificationBeforeDays, GecenSaat
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    String(task.TaskId),
    task.HizmetNo ? String(task.HizmetNo) : String(task.TaskId),
    task.HizmetTalebiId ? String(task.HizmetTalebiId) : null,
    String(task.TaskType || 'Sipariş'),
    task.Amirlik ? String(task.Amirlik) : null,
    task.Santral ? String(task.Santral) : null,
    task.HizmetAdresi ? String(task.HizmetAdresi) : null,
    task.BbkKodu ? String(task.BbkKodu) : null,
    parseInt(task.DurationDays, 10) || 1,
    String(task.StartTime),
    String(task.EndTime),
    parseFloat(task.Latitude) || 0.0,
    parseFloat(task.Longitude) || 0.0,
    task.TeamId ? String(task.TeamId) : null,
    String(task.Status || 'In Progress'),
    parseInt(task.NotificationBeforeDays, 10) || 2,
    parseFloat(task.GecenSaat) || 0.0
  );
}

function updateTaskAddressAndCoords(taskId, { HizmetAdresi, Latitude, Longitude, Santral, Amirlik, BbkKodu }) {
  const db = getDb();
  const updates = [];
  const values = [];

  if (HizmetAdresi !== undefined) {
    updates.push('HizmetAdresi = ?');
    values.push(HizmetAdresi);
  }
  if (Latitude !== undefined && !isNaN(parseFloat(Latitude))) {
    updates.push('Latitude = ?');
    values.push(parseFloat(Latitude));
  }
  if (Longitude !== undefined && !isNaN(parseFloat(Longitude))) {
    updates.push('Longitude = ?');
    values.push(parseFloat(Longitude));
  }
  if (Santral !== undefined) {
    updates.push('Santral = ?');
    values.push(Santral);
  }
  if (Amirlik !== undefined) {
    updates.push('Amirlik = ?');
    values.push(Amirlik);
  }
  if (BbkKodu !== undefined) {
    updates.push('BbkKodu = ?');
    values.push(BbkKodu);
  }

  if (updates.length === 0) return null;

  values.push(String(taskId));
  const stmt = db.prepare(`UPDATE Tasks SET ${updates.join(', ')} WHERE TaskId = ?`);
  stmt.run(...values);
  return getTaskById(taskId);
}

function getTasksWithBbk(onlyMissing = false) {
  const db = getDb();
  let query = "SELECT * FROM Tasks WHERE BbkKodu IS NOT NULL AND TRIM(BbkKodu) != ''";
  if (onlyMissing) {
    query += " AND (HizmetAdresi IS NULL OR TRIM(HizmetAdresi) = '')";
  }
  query += ' ORDER BY StartTime ASC';
  return db.prepare(query).all();
}

function clearDatabase() {
  const db = getDb();
  db.exec('DELETE FROM Tasks;');
  db.exec('DELETE FROM Teams;');
}

function getAllCompletedTasks() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM CompletedTasks ORDER BY id DESC');
  return stmt.all();
}

function clearCompletedTasks() {
  const db = getDb();
  db.exec('DELETE FROM CompletedTasks;');
}

function insertCompletedTask(task) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO CompletedTasks (
      IsemriId, HizmetNo, MusteriId, IsemriTipi, HizmetTuru, AltHizmetTuru,
      Lokasyon, EkipNo, EkipAdi, BildirimZamani, EkibeAtanmaZamani, TamamlanmaZamani,
      Slot, RandevuZamani, Durumu, IsTuru, SiparisKategori,
      ToplamSlaSuresi, KalanSlaSuresi, EkipSlaSuresi, KalanEkipSlaSuresi,
      ToplamYkoSuresi, YkoOrani, KalanYkoSuresi, MudurlukAmirlik,
      AltyapiTipi, SiparisBildirimTarihi, UcCihazKurulumTipi, RawJson
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    );
  `);

  stmt.run(
    task.IsemriId ? String(task.IsemriId) : null,
    task.HizmetNo ? String(task.HizmetNo) : null,
    task.MusteriId ? String(task.MusteriId) : null,
    task.IsemriTipi ? String(task.IsemriTipi) : null,
    task.HizmetTuru ? String(task.HizmetTuru) : null,
    task.AltHizmetTuru ? String(task.AltHizmetTuru) : null,
    task.Lokasyon ? String(task.Lokasyon) : null,
    task.EkipNo ? String(task.EkipNo) : null,
    task.EkipAdi ? String(task.EkipAdi) : null,
    task.BildirimZamani ? String(task.BildirimZamani) : null,
    task.EkibeAtanmaZamani ? String(task.EkibeAtanmaZamani) : null,
    task.TamamlanmaZamani ? String(task.TamamlanmaZamani) : null,
    task.Slot ? String(task.Slot) : null,
    task.RandevuZamani ? String(task.RandevuZamani) : null,
    task.Durumu ? String(task.Durumu) : null,
    task.IsTuru ? String(task.IsTuru) : null,
    task.SiparisKategori ? String(task.SiparisKategori) : null,
    task.ToplamSlaSuresi ? String(task.ToplamSlaSuresi) : null,
    task.KalanSlaSuresi ? String(task.KalanSlaSuresi) : null,
    task.EkipSlaSuresi ? String(task.EkipSlaSuresi) : null,
    task.KalanEkipSlaSuresi ? String(task.KalanEkipSlaSuresi) : null,
    task.ToplamYkoSuresi ? String(task.ToplamYkoSuresi) : null,
    task.YkoOrani ? String(task.YkoOrani) : null,
    task.KalanYkoSuresi ? String(task.KalanYkoSuresi) : null,
    task.MudurlukAmirlik ? String(task.MudurlukAmirlik) : null,
    task.AltyapiTipi ? String(task.AltyapiTipi) : null,
    task.SiparisBildirimTarihi ? String(task.SiparisBildirimTarihi) : null,
    task.UcCihazKurulumTipi ? String(task.UcCihazKurulumTipi) : null,
    task.RawJson ? JSON.stringify(task.RawJson) : null
  );
}

function saveCompletedTasks(tasks, clearExisting = false) {
  const db = getDb();
  if (clearExisting) {
    clearCompletedTasks();
  }
  for (const task of tasks) {
    insertCompletedTask(task);
  }
}

module.exports = {
  getDb,
  initDb,
  getAllTeams,
  getTeamById,
  getAllTasks,
  getTasksByTeamId,
  getTaskById,
  updateTask,
  insertOrReplaceTeam,
  insertOrReplaceTask,
  updateTaskAddressAndCoords,
  getTasksWithBbk,
  clearDatabase,
  getAllCompletedTasks,
  clearCompletedTasks,
  insertCompletedTask,
  saveCompletedTasks,
  DB_PATH
};
