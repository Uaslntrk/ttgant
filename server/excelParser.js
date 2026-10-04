const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('./db');

// Accurate coordinates for Istanbul centers, exchanges (Santral), and neighborhoods
const LOCATION_COORDS = {
  'kumkapı': { lat: 41.0042, lon: 28.9632 },
  'kumkapi': { lat: 41.0042, lon: 28.9632 },
  'tahtakale': { lat: 41.0165, lon: 28.9702 },
  'mesihpaşa': { lat: 41.0076, lon: 28.9565 },
  'mesihpasa': { lat: 41.0076, lon: 28.9565 },
  'laleli': { lat: 41.0094, lon: 28.9575 },
  'mercan': { lat: 41.0142, lon: 28.9688 },
  'rüstempaşa': { lat: 41.0175, lon: 28.9712 },
  'rustempasa': { lat: 41.0175, lon: 28.9712 },
  'beyazıt': { lat: 41.0105, lon: 28.9654 },
  'beyazit': { lat: 41.0105, lon: 28.9654 },
  'eminönü': { lat: 41.0178, lon: 28.9734 },
  'eminonu': { lat: 41.0178, lon: 28.9734 },
  'sirkeci': { lat: 41.0150, lon: 28.9765 },
  'cağaloğlu': { lat: 41.0112, lon: 28.9738 },
  'cagaloglu': { lat: 41.0112, lon: 28.9738 },
  'sultanahmet': { lat: 41.0054, lon: 28.9768 },
  'çemberlitaş': { lat: 41.0085, lon: 28.9720 },
  'cemberlitas': { lat: 41.0085, lon: 28.9720 },
  'gedikpaşa': { lat: 41.0070, lon: 28.9670 },
  'gedikpasa': { lat: 41.0070, lon: 28.9670 },
  'kadırga': { lat: 41.0030, lon: 28.9690 },
  'kadirga': { lat: 41.0030, lon: 28.9690 },
  'nişanca': { lat: 41.0060, lon: 28.9620 },
  'nisanca': { lat: 41.0060, lon: 28.9620 },
  'katip kasım': { lat: 41.0040, lon: 28.9540 },
  'katipkasim': { lat: 41.0040, lon: 28.9540 },
  'yalı': { lat: 41.0010, lon: 28.9560 },
  'yali': { lat: 41.0010, lon: 28.9560 },
  'süleymaniye': { lat: 41.0160, lon: 28.9640 },
  'suleymaniye': { lat: 41.0160, lon: 28.9640 },
  'vefa': { lat: 41.0155, lon: 28.9580 },
  'saraçhane': { lat: 41.0145, lon: 28.9555 },
  'sarachane': { lat: 41.0145, lon: 28.9555 },
  'fatih': { lat: 41.0186, lon: 28.9497 },
  'aksaray': { lat: 41.0089, lon: 28.9489 },
  'horhor': { lat: 41.0125, lon: 28.9510 },
  'iskenderpaşa': { lat: 41.0140, lon: 28.9490 },
  'iskenderpasa': { lat: 41.0140, lon: 28.9490 },
  'akşemsettin': { lat: 41.0165, lon: 28.9450 },
  'aksemsettin': { lat: 41.0165, lon: 28.9450 },
  'ali kuşçu': { lat: 41.0220, lon: 28.9490 },
  'alikuscu': { lat: 41.0220, lon: 28.9490 },
  'zeyrek': { lat: 41.0195, lon: 28.9567 },
  'cibali': { lat: 41.0255, lon: 28.9590 },
  'fener': { lat: 41.0290, lon: 28.9515 },
  'balat': { lat: 41.0310, lon: 28.9482 },
  'ayvansaray': { lat: 41.0375, lon: 28.9412 },
  'dervişali': { lat: 41.0280, lon: 28.9400 },
  'dervisali': { lat: 41.0280, lon: 28.9400 },
  'karagümrük': { lat: 41.0250, lon: 28.9380 },
  'karagumruk': { lat: 41.0250, lon: 28.9380 },
  'hırka-i şerif': { lat: 41.0190, lon: 28.9440 },
  'hirkaiserif': { lat: 41.0190, lon: 28.9440 },
  'topkapı': { lat: 41.0185, lon: 28.9260 },
  'topkapi': { lat: 41.0185, lon: 28.9260 },
  'çapa': { lat: 41.0135, lon: 28.9385 },
  'capa': { lat: 41.0135, lon: 28.9385 },
  'fındıkzade': { lat: 41.0110, lon: 28.9398 },
  'findikzade': { lat: 41.0110, lon: 28.9398 },
  'haseki': { lat: 41.0080, lon: 28.9440 },
  'cerrahpaşa': { lat: 41.0050, lon: 28.9395 },
  'cerrahpasa': { lat: 41.0050, lon: 28.9395 },
  'kocamustafapaşa': { lat: 41.0005, lon: 28.9315 },
  'kocamustafapasa': { lat: 41.0005, lon: 28.9315 },
  'samatya': { lat: 40.9995, lon: 28.9350 },
  'yedikule': { lat: 40.9940, lon: 28.9220 },
  'silivrikapı': { lat: 41.0035, lon: 28.9230 },
  'silivrikapi': { lat: 41.0035, lon: 28.9230 },
  'mevlanakapı': { lat: 41.0100, lon: 28.9250 },
  'mevlanakapi': { lat: 41.0100, lon: 28.9250 },
  'şehremini': { lat: 41.0155, lon: 28.9320 },
  'sehremini': { lat: 41.0155, lon: 28.9320 },
  'karaköy': { lat: 41.0225, lon: 28.9774 },
  'karakoy': { lat: 41.0225, lon: 28.9774 },
  'beşiktaş': { lat: 41.0428, lon: 29.0077 },
  'besiktas': { lat: 41.0428, lon: 29.0077 },
  'kadıköy': { lat: 40.9927, lon: 29.0277 },
  'kadikoy': { lat: 40.9927, lon: 29.0277 },
  'üsküdar': { lat: 41.0267, lon: 29.0153 },
  'uskudar': { lat: 41.0267, lon: 29.0153 },
  'bakırköy': { lat: 40.9782, lon: 28.8724 },
  'bakirkoy': { lat: 40.9782, lon: 28.8724 },
  'şişli': { lat: 41.0602, lon: 28.9877 },
  'sisli': { lat: 41.0602, lon: 28.9877 }
};

function resolveCoordinates(address, santral, rawLat, rawLon, salt = 0) {
  if (rawLat && rawLon && !isNaN(parseFloat(rawLat)) && !isNaN(parseFloat(rawLon))) {
    return { lat: parseFloat(rawLat), lon: parseFloat(rawLon) };
  }

  const combined = `${address || ''} ${santral || ''}`.toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (combined.includes(key)) {
      // Add tiny jitter so tasks in same neighborhood don't overlap completely
      const latJitter = ((salt % 17) - 8) * 0.0008;
      const lonJitter = (((salt * 7) % 19) - 9) * 0.0008;
      return {
        lat: Math.round((coords.lat + latJitter) * 100000) / 100000,
        lon: Math.round((coords.lon + lonJitter) * 100000) / 100000
      };
    }
  }

  // Default coordinate (Kumkapı / Fatih central)
  const latJitter = ((salt % 17) - 8) * 0.001;
  const lonJitter = (((salt * 7) % 19) - 9) * 0.001;
  return {
    lat: Math.round((41.0082 + latJitter) * 100000) / 100000,
    lon: Math.round((28.9650 + lonJitter) * 100000) / 100000
  };
}

function formatDate(val) {
  if (!val) return new Date().toISOString().split('T')[0];

  // Excel serial number
  if (typeof val === 'number') {
    const dateObj = xlsx.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  const parts = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (parts) {
    return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }

  const isoParts = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (isoParts) {
    return `${isoParts[1]}-${isoParts[2].padStart(2, '0')}-${isoParts[3].padStart(2, '0')}`;
  }

  return str;
}

/**
 * Universal Parser: Parses either a TTNET operational format or a standard 2-sheet format
 */
function parseAndImportRows(rows, shouldClear = true) {
  if (shouldClear) {
    db.clearDatabase();
  }

  const teamsMap = new Map();
  const tasksList = [];

  let idx = 0;
  for (const row of rows) {
    idx++;

    // 1. Check for TTNET columns
    const ekipNo = row['Ekip No'] || row.EkipNo || row.TeamId || row.EkipId;
    const ekipAdi = row['Ekip Adi'] || row['Ekip Adı'] || row.EkipAdi || row.TeamName || (ekipNo ? `Ekip ${ekipNo}` : 'Genel Ekip');
    const amirlik = row['Amirlik'] || row.Amirlik || '';
    const santral = row['Santral'] || row.Santral || '';
    const hizmetNo = row['Hizmet No'] || row.HizmetNo || row.TaskId || row['İş Emri ID'] || row.IsemriID || `IE-${idx}`;
    const hizmetTalebiId = row['Hizmet Talebi Id'] || row.HizmetTalebiId || '';
    const taskType = row['Isemri Kategori Adi'] || row['İşemri Kategori Adı'] || row.TaskType || row['Hizmet Türü Adı'] || 'Sipariş';
    const rawAddress = row['Hizmet Adresi'] || row['HizmetAdresi'] || row.Adres || row.Address || '';
    const bbkKodu = row['Bbk Kodu'] || row['BBK Kodu'] || row['bbk kodu'] || row['Bbk'] || row['BBK'] || row.BbkKodu || row.BBK || row['Bağımsız Bölüm Kodu'] || '';
    const rawStart = row['Ekibe Atanma Zamanı'] || row.StartTime || row['Bildirim Zamanı'] || row['İlk Randevu Başlangıç Zamanı'];
    const rawEnd = row['Ilk Randevu Baslangic Zamani'] || row['İlk Randevu Başlangıç Zamanı'] || row.EndTime;
    const gecenSaat = parseFloat(row['Bugün - Ekibe Atanma Zamanı (Saat)'] || row['Bugün - Bildirim Zamanı (Saat)'] || 0);

    const teamKey = ekipNo || ekipAdi;
    if (teamKey && !teamsMap.has(teamKey)) {
      const teamCoords = resolveCoordinates(amirlik, santral, null, null, teamsMap.size + 1);
      teamsMap.set(teamKey, {
        TeamId: String(teamKey),
        TeamName: String(ekipAdi),
        Amirlik: amirlik,
        Latitude: teamCoords.lat,
        Longitude: teamCoords.lon
      });
    }

    const taskCoords = resolveCoordinates(rawAddress, santral, row.Latitude || row.Lat, row.Longitude || row.Lon, idx);
    const startTime = formatDate(rawStart);

    let endTime = rawEnd ? formatDate(rawEnd) : null;
    let durationDays = parseInt(row.DurationDays || row.Sure || row.Süre || 2, 10);

    if (!endTime) {
      const st = new Date(startTime);
      st.setDate(st.getDate() + durationDays);
      endTime = st.toISOString().split('T')[0];
    } else {
      const st = new Date(startTime);
      const et = new Date(endTime);
      const diff = Math.max(1, Math.round((et - st) / (1000 * 60 * 60 * 24)));
      durationDays = diff;
    }

    const notifDays = parseInt(row.NotificationBeforeDays || 2, 10);

    tasksList.push({
      TaskId: String(hizmetNo),
      HizmetNo: String(hizmetNo),
      HizmetTalebiId: String(hizmetTalebiId),
      TaskType: String(taskType),
      Amirlik: amirlik,
      Santral: santral,
      HizmetAdresi: String(rawAddress),
      BbkKodu: bbkKodu ? String(bbkKodu).trim() : null,
      DurationDays: durationDays,
      StartTime: startTime,
      EndTime: endTime,
      Latitude: taskCoords.lat,
      Longitude: taskCoords.lon,
      TeamId: teamKey ? String(teamKey) : null,
      Status: 'In Progress',
      NotificationBeforeDays: notifDays,
      GecenSaat: gecenSaat
    });
  }

  // Insert teams
  for (const team of teamsMap.values()) {
    db.insertOrReplaceTeam(team);
  }

  // Insert tasks
  for (const task of tasksList) {
    db.insertOrReplaceTask(task);
  }

  return {
    importedTeams: teamsMap.size,
    importedTasks: tasksList.length
  };
}

/**
 * Imports from an Excel file path
 */
function parseAndImportExcel(filePath, shouldClear = true) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames;

  // Check if it's the 2-sheet format (Teams + Tasks)
  const teamsSheetName = sheetNames.find(s => s.toLowerCase().includes('team') || s.toLowerCase().includes('ekip'));
  const tasksSheetName = sheetNames.find(s => s.toLowerCase().includes('task') || s.toLowerCase().includes('görev') || s.toLowerCase().includes('gorev'));

  if (teamsSheetName && tasksSheetName && teamsSheetName !== tasksSheetName) {
    if (shouldClear) db.clearDatabase();

    const teamsData = xlsx.utils.sheet_to_json(workbook.Sheets[teamsSheetName]);
    const tasksData = xlsx.utils.sheet_to_json(workbook.Sheets[tasksSheetName]);

    let tCount = 0;
    for (const row of teamsData) {
      const teamId = row.TeamId || row.EkipId || `T${tCount + 1}`;
      const teamName = row.TeamName || row.EkipAdi || `Ekip ${teamId}`;
      const coords = resolveCoordinates(row.HizmetAdresi || row.Adres, null, row.Latitude, row.Longitude, tCount);
      db.insertOrReplaceTeam({
        TeamId: String(teamId),
        TeamName: String(teamName),
        Amirlik: row.Amirlik || '',
        Latitude: coords.lat,
        Longitude: coords.lon
      });
      tCount++;
    }

    let kCount = 0;
    for (const row of tasksData) {
      kCount++;
      const taskId = row.TaskId || row.HizmetNo || `TK-${kCount}`;
      const bbkKodu = row['Bbk Kodu'] || row['BBK Kodu'] || row['bbk kodu'] || row['Bbk'] || row['BBK'] || row.BbkKodu || row.BBK || '';
      const coords = resolveCoordinates(row.HizmetAdresi || row.Adres, null, row.Latitude, row.Longitude, kCount);
      const st = formatDate(row.StartTime);
      const et = formatDate(row.EndTime);

      db.insertOrReplaceTask({
        TaskId: String(taskId),
        HizmetNo: String(row.HizmetNo || taskId),
        HizmetTalebiId: String(row.HizmetTalebiId || ''),
        TaskType: String(row.TaskType || 'Sipariş'),
        Amirlik: row.Amirlik || '',
        Santral: row.Santral || '',
        HizmetAdresi: row.HizmetAdresi || '',
        BbkKodu: bbkKodu ? String(bbkKodu).trim() : null,
        DurationDays: parseInt(row.DurationDays || 1, 10),
        StartTime: st,
        EndTime: et,
        Latitude: coords.lat,
        Longitude: coords.lon,
        TeamId: row.TeamId ? String(row.TeamId) : null,
        Status: row.Status || 'In Progress',
        NotificationBeforeDays: parseInt(row.NotificationBeforeDays || 2, 10),
        GecenSaat: parseFloat(row.GecenSaat || 0)
      });
    }

    return { importedTeams: tCount, importedTasks: kCount };
  }

  // Single sheet operational table (e.g. TTNET Bekleyen İşler)
  const firstSheet = workbook.Sheets[sheetNames[0]];
  const allRows = xlsx.utils.sheet_to_json(firstSheet);
  return parseAndImportRows(allRows, shouldClear);
}

/**
 * Imports from clipboard / raw TSV or CSV text (immune to browser file-upload security)
 */
function parseAndImportClipboard(rawText, shouldClear = true) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('Yapıştırılan metin boş!');
  }

  const workbook = xlsx.read(rawText, { type: 'string' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(firstSheet);

  if (rows.length === 0) {
    throw new Error('Yapıştırılan metinden geçerli satır okunamadı.');
  }

  return parseAndImportRows(rows, shouldClear);
}

function formatDateTime(val) {
  if (!val && val !== 0) return '';
  if (typeof val === 'number') {
    const dateObj = xlsx.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      const H = String(dateObj.H || 0).padStart(2, '0');
      const M = String(dateObj.M || 0).padStart(2, '0');
      return `${d}.${m}.${y} ${H}:${M}`;
    }
  }
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    const H = String(val.getHours()).padStart(2, '0');
    const M = String(val.getMinutes()).padStart(2, '0');
    return `${d}.${m}.${y} ${H}:${M}`;
  }
  return String(val).trim();
}

function parseAndImportCompletedRows(rawRows, shouldClear = true) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('Geçerli veri satırı bulunamadı.');
  }

  // Find header row index
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      if (row.some(cell => {
        const str = String(cell || '').toLowerCase();
        return str.includes('zamanı') || str.includes('zamani') || str.includes('işemri') || str.includes('isemri') || str.includes('hizmet no');
      })) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    if (typeof rawRows[0] === 'object' && !Array.isArray(rawRows[0])) {
      const parsedItems = rawRows.map(row => {
        const keys = Object.keys(row);
        const findVal = (...aliases) => {
          for (const a of aliases) {
            const matched = keys.find(k => k.trim().toLowerCase() === a.toLowerCase());
            if (matched && row[matched] !== undefined) return row[matched];
          }
          return undefined;
        };
        return {
          IsemriId: findVal('İşemri Id', 'Isemri Id', 'İşemri ID', 'Isemri ID', 'İş Emri No', 'TaskId'),
          HizmetNo: findVal('Hizmet No', 'HizmetNo'),
          MusteriId: findVal('Müşteri Id', 'Musteri Id'),
          IsemriTipi: findVal('İş Emri Tipi', 'Isemri Tipi', 'Isemri Tipi Adı', 'İş Tipi'),
          HizmetTuru: findVal('Hizmet Türü', 'Hizmet Turu', 'Hizmet Türü Adı'),
          AltHizmetTuru: findVal('Alt Hizmet Türü', 'Alt Hizmet Turu'),
          Lokasyon: findVal('Lokasyon', 'Hizmet Adresi', 'Adres'),
          EkipNo: findVal('Ekip No', 'Ekip Kodu'),
          EkipAdi: findVal('Ekip Adı', 'Ekip Adi'),
          BildirimZamani: formatDateTime(findVal('Bildirim Zamanı', 'Bildirim Zamani', 'Bildirim Tarihi')),
          EkibeAtanmaZamani: formatDateTime(findVal('Ekibe Atanma Zamanı', 'Ekibe Atanma Zamani', 'Atanma Zamanı')),
          TamamlanmaZamani: formatDateTime(findVal('Tamamlanma Zamanı', 'Tamamlanma Zamanı ', 'Tamamlanma Zamani', 'Isemri Tamamlanma Zamanı')),
          Slot: findVal('Ajandadaki Yeri (Slot)', 'Slot'),
          RandevuZamani: formatDateTime(findVal('Randevu Zamanı', 'Randevu Zamani')),
          Durumu: findVal('Durumu', 'Isemri Durumu', 'Durum'),
          IsTuru: findVal('İş Türü/Alt İş Türü', 'Is Turu'),
          SiparisKategori: findVal('Sipariş Kategori', 'Isemri Kategori Adi'),
          ToplamSlaSuresi: findVal('Toplam Sla Süresi', 'Toplam SLA Süresi'),
          KalanSlaSuresi: findVal('Kalan Sla Süresi', 'Kalan SLA Süresi'),
          EkipSlaSuresi: findVal('Ekip SLA Süresi', 'Ekip Sla Süresi'),
          KalanEkipSlaSuresi: findVal('Kalan Ekip Sla Süresi', 'Kalan Ekip SLA Süresi'),
          ToplamYkoSuresi: findVal('Toplam YKO Süresi', 'Toplam Yko Süresi'),
          YkoOrani: findVal('YKO oranı', 'YKO Oranı'),
          KalanYkoSuresi: findVal('Kalan YKO Süresi', 'Kalan Yko Süresi'),
          MudurlukAmirlik: findVal('Müdürlük-Amirlik', 'Amirlik', 'Müdürlük'),
          AltyapiTipi: findVal('Altyapı Tipi', 'Altyapi Tipi'),
          SiparisBildirimTarihi: formatDateTime(findVal('Sipariş Bildirim Tarihi')),
          UcCihazKurulumTipi: findVal('Uç Cihaz Kurulum Tipi'),
          RawJson: row
        };
      });
      db.saveCompletedTasks(parsedItems, shouldClear);
      return { importedCompleted: parsedItems.length };
    }
    throw new Error('Başlık satırı tespit edilemedi.');
  }

  const rawHeaders = rawRows[headerIdx];
  const headers = rawHeaders.map(h => String(h || '').trim());

  const parsedItems = [];
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length === 0 || row.every(c => c === undefined || c === null || c === '')) {
      continue;
    }

    const rowObj = {};
    headers.forEach((h, colIdx) => {
      if (h) rowObj[h] = row[colIdx];
    });

    const findVal = (...aliases) => {
      for (const a of aliases) {
        const matched = headers.find(h => h.toLowerCase() === a.toLowerCase());
        if (matched && rowObj[matched] !== undefined) return rowObj[matched];
      }
      return undefined;
    };

    parsedItems.push({
      IsemriId: findVal('İşemri Id', 'Isemri Id', 'İşemri ID', 'Isemri ID', 'İş Emri No'),
      HizmetNo: findVal('Hizmet No', 'HizmetNo'),
      MusteriId: findVal('Müşteri Id', 'Musteri Id'),
      IsemriTipi: findVal('İş Emri Tipi', 'Isemri Tipi', 'Isemri Tipi Adı', 'İş Tipi'),
      HizmetTuru: findVal('Hizmet Türü', 'Hizmet Turu', 'Hizmet Türü Adı'),
      AltHizmetTuru: findVal('Alt Hizmet Türü', 'Alt Hizmet Turu'),
      Lokasyon: findVal('Lokasyon', 'Hizmet Adresi', 'Adres'),
      EkipNo: findVal('Ekip No', 'Ekip Kodu'),
      EkipAdi: findVal('Ekip Adı', 'Ekip Adi'),
      BildirimZamani: formatDateTime(findVal('Bildirim Zamanı', 'Bildirim Zamani', 'Bildirim Tarihi')),
      EkibeAtanmaZamani: formatDateTime(findVal('Ekibe Atanma Zamanı', 'Ekibe Atanma Zamani', 'Atanma Zamanı')),
      TamamlanmaZamani: formatDateTime(findVal('Tamamlanma Zamanı', 'Tamamlanma Zamanı ', 'Tamamlanma Zamani', 'Isemri Tamamlanma Zamanı')),
      Slot: findVal('Ajandadaki Yeri (Slot)', 'Slot'),
      RandevuZamani: formatDateTime(findVal('Randevu Zamanı', 'Randevu Zamani')),
      Durumu: findVal('Durumu', 'Isemri Durumu', 'Durum'),
      IsTuru: findVal('İş Türü/Alt İş Türü', 'Is Turu'),
      SiparisKategori: findVal('Sipariş Kategori', 'Isemri Kategori Adi'),
      ToplamSlaSuresi: findVal('Toplam Sla Süresi', 'Toplam SLA Süresi'),
      KalanSlaSuresi: findVal('Kalan Sla Süresi', 'Kalan SLA Süresi'),
      EkipSlaSuresi: findVal('Ekip SLA Süresi', 'Ekip Sla Süresi'),
      KalanEkipSlaSuresi: findVal('Kalan Ekip Sla Süresi', 'Kalan Ekip SLA Süresi'),
      ToplamYkoSuresi: findVal('Toplam YKO Süresi', 'Toplam Yko Süresi'),
      YkoOrani: findVal('YKO oranı', 'YKO Oranı'),
      KalanYkoSuresi: findVal('Kalan YKO Süresi', 'Kalan Yko Süresi'),
      MudurlukAmirlik: findVal('Müdürlük-Amirlik', 'Amirlik', 'Müdürlük'),
      AltyapiTipi: findVal('Altyapı Tipi', 'Altyapi Tipi'),
      SiparisBildirimTarihi: formatDateTime(findVal('Sipariş Bildirim Tarihi')),
      UcCihazKurulumTipi: findVal('Uç Cihaz Kurulum Tipi'),
      RawJson: rowObj
    });
  }

  db.saveCompletedTasks(parsedItems, shouldClear);
  return { importedCompleted: parsedItems.length };
}

function parseAndImportCompletedExcel(filePathOrBuffer, shouldClear = true) {
  let workbook;
  if (typeof filePathOrBuffer === 'string') {
    if (!fs.existsSync(filePathOrBuffer)) {
      throw new Error(`Dosya bulunamadı: ${filePathOrBuffer}`);
    }
    workbook = xlsx.readFile(filePathOrBuffer, { cellDates: false });
  } else {
    workbook = xlsx.read(filePathOrBuffer, { type: 'buffer', cellDates: false });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  return parseAndImportCompletedRows(rawRows, shouldClear);
}

function parseAndImportCompletedClipboard(rawText, shouldClear = true) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('Yapıştırılan metin boş!');
  }
  const workbook = xlsx.read(rawText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  return parseAndImportCompletedRows(rawRows, shouldClear);
}

module.exports = {
  parseAndImportExcel,
  parseAndImportRows,
  parseAndImportClipboard,
  parseAndImportCompletedExcel,
  parseAndImportCompletedRows,
  parseAndImportCompletedClipboard,
  resolveCoordinates
};
