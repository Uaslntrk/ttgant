const cron = require('node-cron');
const db = require('./db');

const NOTIF_DAYS_DEFAULT = process.env.NOTIF_DAYS || 2;
const notificationHistory = [];

/**
 * Bitiş tarihi yaklaşan / geçen görevleri kontrol eder.
 * Yalnızca uygulama içi bildirim listesine kaydeder.
 */
function checkNotifications() {
  const database = db.getDb();
  const defaultDays = parseInt(NOTIF_DAYS_DEFAULT, 10);

  try {
    const stmt = database.prepare(`
      SELECT t.*, tm.TeamName 
      FROM Tasks t
      LEFT JOIN Teams tm ON t.TeamId = tm.TeamId
      WHERE t.Status != 'Completed' 
        AND julianday('now') >= julianday(t.EndTime, '-' || COALESCE(t.NotificationBeforeDays, ${defaultDays}) || ' day')
      ORDER BY t.EndTime ASC
    `);

    const dueTasks = stmt.all();

    for (const task of dueTasks) {
      const now = new Date();
      const endDate = new Date(task.EndTime);
      const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      const isOverdue = diffDays < 0;
      const alertTitle = isOverdue
        ? `⚠️ GECİKMİŞ GÖREV: #${task.TaskId}`
        : `⏰ Yaklaşan Görev Uyarısı: #${task.TaskId}`;

      const alertMessage = isOverdue
        ? `${task.TaskType} (${task.TeamName || 'Atanmamış'}) süresi ${Math.abs(diffDays)} gün önce doldu!`
        : `${task.TaskType} (${task.TeamName || 'Atanmamış'}) için ${diffDays} gün kaldı!`;

      const record = {
        id: `${task.TaskId}-${Date.now()}`,
        taskId: task.TaskId,
        taskType: task.TaskType,
        teamName: task.TeamName,
        diffDays,
        isOverdue,
        title: alertTitle,
        message: alertMessage,
        timestamp: new Date().toISOString()
      };

      notificationHistory.unshift(record);
      if (notificationHistory.length > 50) notificationHistory.pop();
    }

    return dueTasks;
  } catch (err) {
    console.error('[Cron] Bildirim kontrol hatası:', err.message);
    return [];
  }
}

/**
 * Cron servisini başlatır (saatte bir çalışır).
 */
function initCron() {
  console.log('[Cron] Görev kontrol servisi başlatıldı (Her saat başı kontrol).');

  setTimeout(() => {
    checkNotifications();
  }, 2000);

  cron.schedule('0 * * * *', () => {
    checkNotifications();
  });
}

function getNotificationHistory() {
  return notificationHistory;
}

module.exports = {
  initCron,
  checkNotifications,
  getNotificationHistory
};
