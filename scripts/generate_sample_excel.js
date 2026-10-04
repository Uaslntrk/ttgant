const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const outputPath = process.argv[2] || path.resolve(__dirname, '..', 'gantt_data.xlsx');

// Reference date is today
const today = new Date();
function formatD(d) {
  return d.toISOString().split('T')[0];
}
function addDays(d, days) {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

// 1. Teams data (Istanbul service hubs with realistic coordinates)
const teams = [
  {
    TeamId: 'T1',
    TeamName: 'Anadolu Saha Ekibi (Kadıköy)',
    HizmetAdresi: 'Kadıköy, İstanbul',
    Latitude: 40.9927,
    Longitude: 29.0277
  },
  {
    TeamId: 'T2',
    TeamName: 'Avrupa Merkez Ekibi (Beşiktaş)',
    HizmetAdresi: 'Beşiktaş, İstanbul',
    Latitude: 41.0428,
    Longitude: 29.0077
  },
  {
    TeamId: 'T3',
    TeamName: 'Batı Saha Ekibi (Bakırköy)',
    HizmetAdresi: 'Bakırköy, İstanbul',
    Latitude: 40.9782,
    Longitude: 28.8724
  },
  {
    TeamId: 'T4',
    TeamName: 'Boğaziçi Ekibi (Üsküdar)',
    HizmetAdresi: 'Üsküdar, İstanbul',
    Latitude: 41.0267,
    Longitude: 29.0153
  }
];

// 2. Tasks data: mix of overdue (negative remaining days), urgent (due in 1-2 days), and upcoming
const tasks = [
  {
    TaskId: 'TK-101',
    TaskType: 'Fiber Altyapı Döşeme',
    DurationDays: 5,
    StartTime: formatD(addDays(today, -8)),
    EndTime: formatD(addDays(today, -3)), // Overdue! (-3 days)
    Latitude: 40.9985,
    Longitude: 29.0560, // Göztepe, Kadıköy
    TeamId: 'T1',
    Status: 'Delayed',
    NotificationBeforeDays: 2
  },
  {
    TaskId: 'TK-102',
    TaskType: 'Sinyal Ölçüm ve Kalibrasyon',
    DurationDays: 3,
    StartTime: formatD(addDays(today, -4)),
    EndTime: formatD(addDays(today, -1)), // Overdue! (-1 days)
    Latitude: 41.0030,
    Longitude: 29.0350, // Hasanpaşa, Kadıköy
    TeamId: 'T1',
    Status: 'In Progress',
    NotificationBeforeDays: 2
  },
  {
    TaskId: 'TK-103',
    TaskType: 'Arıza Onarım (Saha Dağıtım)',
    DurationDays: 2,
    StartTime: formatD(addDays(today, -1)),
    EndTime: formatD(addDays(today, 1)), // Due tomorrow! Triggers notification
    Latitude: 41.0450,
    Longitude: 29.0020, // Yıldız, Beşiktaş
    TeamId: 'T2',
    Status: 'In Progress',
    NotificationBeforeDays: 2
  },
  {
    TaskId: 'TK-104',
    TaskType: 'Santral Bakım & Yenileme',
    DurationDays: 7,
    StartTime: formatD(addDays(today, 0)),
    EndTime: formatD(addDays(today, 7)),
    Latitude: 41.0600,
    Longitude: 28.9880, // Mecidiyeköy / Şişli
    TeamId: 'T2',
    Status: 'Pending',
    NotificationBeforeDays: 3
  },
  {
    TaskId: 'TK-105',
    TaskType: 'Müşteri Terminal Montajı',
    DurationDays: 4,
    StartTime: formatD(addDays(today, -2)),
    EndTime: formatD(addDays(today, 2)), // Due in 2 days! Triggers notification
    Latitude: 40.9850,
    Longitude: 28.8650, // Ataköy, Bakırköy
    TeamId: 'T3',
    Status: 'In Progress',
    NotificationBeforeDays: 2
  },
  {
    TaskId: 'TK-106',
    TaskType: 'Omurga Switch Değişimi',
    DurationDays: 3,
    StartTime: formatD(addDays(today, 2)),
    EndTime: formatD(addDays(today, 5)),
    Latitude: 40.9650,
    Longitude: 28.8250, // Florya / Yeşilköy
    TeamId: 'T3',
    Status: 'Pending',
    NotificationBeforeDays: 2
  },
  {
    TaskId: 'TK-107',
    TaskType: 'Radyolink Hat Kontrolü',
    DurationDays: 4,
    StartTime: formatD(addDays(today, -3)),
    EndTime: formatD(addDays(today, 1)), // Due in 1 day! Triggers notification
    Latitude: 41.0350,
    Longitude: 29.0280, // Bağlarbaşı, Üsküdar
    TeamId: 'T4',
    Status: 'In Progress',
    NotificationBeforeDays: 2
  },
  {
    TaskId: 'TK-108',
    TaskType: 'Kamera & Güvenlik Sistemi Devreye Alma',
    DurationDays: 6,
    StartTime: formatD(addDays(today, 1)),
    EndTime: formatD(addDays(today, 7)),
    Latitude: 41.0180,
    Longitude: 29.0550, // Altunizade / Çamlıca
    TeamId: 'T4',
    Status: 'Pending',
    NotificationBeforeDays: 2
  },
  {
    TaskId: 'TK-109',
    TaskType: 'Acil Hat Güçlendirme',
    DurationDays: 2,
    StartTime: formatD(addDays(today, -5)),
    EndTime: formatD(addDays(today, -3)), // Overdue! (-3 days)
    Latitude: 41.0220,
    Longitude: 28.9750, // Karaköy / Tarihi Yarımada
    TeamId: 'T2',
    Status: 'Delayed',
    NotificationBeforeDays: 1
  },
  {
    TaskId: 'TK-110',
    TaskType: 'Fiber Sonlandırma Testi',
    DurationDays: 3,
    StartTime: formatD(addDays(today, -10)),
    EndTime: formatD(addDays(today, -7)),
    Latitude: 40.9880,
    Longitude: 29.0320, // Kadıköy Rıhtım
    TeamId: 'T1',
    Status: 'Completed',
    NotificationBeforeDays: 2
  }
];

const wb = xlsx.utils.book_new();

const teamsWs = xlsx.utils.json_to_sheet(teams);
xlsx.utils.book_append_sheet(wb, teamsWs, 'Teams');

const tasksWs = xlsx.utils.json_to_sheet(tasks);
xlsx.utils.book_append_sheet(wb, tasksWs, 'Tasks');

xlsx.writeFile(wb, outputPath);

console.log(`✅ Örnek Excel dosyası başarıyla üretildi: ${outputPath}`);
console.log(`📊 Ekip sayısı: ${teams.length}, Görev sayısı: ${tasks.length}`);
