require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { parseAndImportExcel } = require('../server/excelParser');

const targetPath = process.argv[2] || process.env.EXCEL_PATH || path.resolve(__dirname, '..', 'gantt_data.xlsx');

console.log(`===============================================`);
console.log(`📥 Excel -> SQLite İçe Aktarım Başlatılıyor...`);
console.log(`📄 Hedef Dosya: ${targetPath}`);
console.log(`===============================================`);

try {
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ HATA: Dosya bulunamadı: ${targetPath}`);
    console.log(`💡 İpucu: Önce örnek veri oluşturmak için: npm run generate-sample`);
    process.exit(1);
  }

  const result = parseAndImportExcel(targetPath, true);
  console.log(`✅ İçe aktarım tamamlandı!`);
  console.log(`👥 Aktarılan Ekip: ${result.importedTeams}`);
  console.log(`📋 Aktarılan Görev: ${result.importedTasks}`);
  console.log(`💾 Veritabanı: gantt_geo.db güncellendi.`);
  console.log(`===============================================`);
} catch (err) {
  console.error(`❌ İçe aktarma sırasında hata oluştu:`, err.message);
  process.exit(1);
}
