const puppeteer = require('puppeteer-core');
const db = require('./db');

class HattatService {
  constructor() {
    this.browser = null;
    this.hattatPage = null;
    this.isInitializing = false;
    this.lastLoginTime = null;
    this.syncStatus = {
      isRunning: false,
      total: 0,
      current: 0,
      updated: 0,
      failed: 0,
      currentBbk: '',
      message: 'Boşta'
    };
  }

  getConfig() {
    return {
      loginUrl: process.env.HATTAT_LOGIN_URL || 'https://ttcbs.turktelekom.com.tr/Login',
      identity: process.env.HATTAT_IDENTITY || '00732366',
      password: process.env.HATTAT_PASSWORD || 'Turktelekom2030',
      chromePath: process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    };
  }

  async ensureSession() {
    // If browser and page exist and are active
    if (this.browser && this.hattatPage && !this.hattatPage.isClosed()) {
      try {
        // Quick health check
        const url = this.hattatPage.url();
        if (url.includes('hattat.turktelekom.com.tr')) {
          return this.hattatPage;
        }
      } catch (e) {
        console.warn('[HattatService] Mevcut oturum kontrolünde hata, yeniden başlatılıyor:', e.message);
      }
    }

    if (this.isInitializing) {
      // Wait for ongoing initialization
      while (this.isInitializing) {
        await new Promise(r => setTimeout(r, 500));
      }
      if (this.hattatPage && !this.hattatPage.isClosed()) {
        return this.hattatPage;
      }
    }

    this.isInitializing = true;
    try {
      if (this.browser) {
        try { await this.browser.close(); } catch (e) { }
        this.browser = null;
        this.hattatPage = null;
      }

      const config = this.getConfig();
      console.log('[HattatService] Chrome başlatılıyor:', config.chromePath);

      this.browser = await puppeteer.launch({
        executablePath: config.chromePath,
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--disable-web-security'
        ]
      });

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      console.log('[HattatService] TTCBS Giriş sayfasına gidiliyor:', config.loginUrl);
      await page.goto(config.loginUrl, { waitUntil: 'networkidle2', timeout: 35000 });

      console.log('[HattatService] Sicil ve şifre giriliyor...');
      await page.waitForSelector('input[name="Identity"]', { timeout: 15000 });
      await page.type('input[name="Identity"]', config.identity);
      await page.type('input[name="Detail.Password"]', config.password);

      console.log('[HattatService] Giriş yapılıyor...');
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], form button, .btn-primary');
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 }),
          submitBtn.click()
        ]);
      } else {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 }),
          page.keyboard.press('Enter')
        ]);
      }

      console.log('[HattatService] TTCBS giriş başarılı. Hattat linki aranıyor...');
      await page.waitForSelector('a[href*="RedirectApp/76"]', { timeout: 20000 });

      const hattatUrl = await page.evaluate(() => {
        const a = document.querySelector('a[href*="RedirectApp/76"]');
        return a ? a.href : null;
      });

      console.log('[HattatService] HaTTat sayfasına geçiliyor:', hattatUrl);
      this.hattatPage = await this.browser.newPage();
      await this.hattatPage.setViewport({ width: 1280, height: 800 });
      await this.hattatPage.goto(hattatUrl, { waitUntil: 'networkidle2', timeout: 45000 });

      console.log('[HattatService] HaTTat oturumu başarıyla açıldı:', this.hattatPage.url());
      this.lastLoginTime = new Date();

      // Close the first portal page to save RAM
      try { await page.close(); } catch (e) { }

      return this.hattatPage;
    } catch (err) {
      console.error('[HattatService] Oturum açma hatası:', err);
      if (this.browser) {
        try { await this.browser.close(); } catch (e) { }
        this.browser = null;
        this.hattatPage = null;
      }
      throw new Error(`Hattat oturumu açılamadı: ${err.message}`);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Queries a single BBK code on Hattat
   */
  async queryBbk(bbk) {
    if (!bbk) {
      throw new Error('BBK kodu belirtilmedi.');
    }

    const cleanBbk = String(bbk).trim();
    const page = await this.ensureSession();

    try {
      const result = await page.evaluate(async (bbkCode) => {
        try {
          const res = await fetch('https://hattat.turktelekom.com.tr/WebMethodPage.aspx/BbkBilgisiAnaliziniGetir', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({ bbk: String(bbkCode), tip: '0' })
          });

          if (!res.ok) {
            return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
          }

          const json = await res.json();
          return { ok: true, data: json };
        } catch (err) {
          return { ok: false, error: err.message };
        }
      }, cleanBbk);

      if (!result.ok) {
        throw new Error(result.error || 'Bbk sorgusu başarısız oldu.');
      }

      const payload = result.data?.d;
      if (!payload || !Array.isArray(payload) || payload.length === 0) {
        return {
          bbk: cleanBbk,
          found: false,
          address: null,
          message: 'Sonuç bulunamadı'
        };
      }

      const item = payload[0];

      // Extract address: prefer lstProje[0].CizimAdi, otherwise build from lstBinaAboneleri
      let address = '';
      if (item.lstProje && item.lstProje.length > 0 && item.lstProje[0].CizimAdi) {
        address = item.lstProje[0].CizimAdi.trim();
      }

      const bina = (item.lstBinaAboneleri && item.lstBinaAboneleri.length > 0) ? item.lstBinaAboneleri[0] : null;
      if (!address && bina) {
        const parts = [];
        if (bina.MahalleAdi) parts.push(`${bina.MahalleAdi} MH.`);
        if (bina.CsmbAd) parts.push(`${bina.CsmbAd} SK.`);
        if (bina.SiteAdi) parts.push(bina.SiteAdi);
        if (bina.DiskapiNo) parts.push(`NO:${bina.DiskapiNo}`);
        if (bina.IcKapiNo && bina.IcKapiNo !== '0') parts.push(`İÇ KAPI:${bina.IcKapiNo}`);
        if (bina.IlceAdi) parts.push(bina.IlceAdi);
        if (bina.IlAdi) parts.push(`/ ${bina.IlAdi}`);
        address = parts.join(' ').trim();
      }

      // Extract coordinates (Py = Latitude, Px = Longitude)
      const lat = item.Py ? parseFloat(item.Py) : null;
      const lon = item.Px ? parseFloat(item.Px) : null;

      // Extract Santral / Müdürlük info
      const tms = (item.lstTmsAnaliz && item.lstTmsAnaliz.length > 0) ? item.lstTmsAnaliz[0] : null;
      const santral = tms ? tms.TmsSantralAdi : (bina ? bina.TmsSantral : null);
      const amirlik = tms ? tms.Mudurluk : null;

      return {
        bbk: cleanBbk,
        found: !!address || !!(lat && lon),
        address: address || null,
        latitude: lat && !isNaN(lat) ? lat : null,
        longitude: lon && !isNaN(lon) ? lon : null,
        santral: santral || null,
        amirlik: amirlik || null,
        binaKodu: bina ? bina.BinaKod : null,
        raw: item
      };

    } catch (err) {
      console.error(`[HattatService] BBK (${cleanBbk}) sorgulama hatası:`, err.message);
      // If session might be dead, invalidate page
      if (err.message.includes('Session closed') || err.message.includes('Target closed')) {
        this.hattatPage = null;
      }
      throw err;
    }
  }

  /**
   * Sync tasks in DB that have BBK code
   */
  async syncTasks(onlyMissing = false) {
    if (this.syncStatus.isRunning) {
      return { success: false, message: 'Senkronizasyon işlemi zaten çalışıyor.', status: this.syncStatus };
    }

    const tasks = db.getTasksWithBbk(onlyMissing);
    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        message: onlyMissing 
          ? 'Adresi eksik olan BBK kodlu görev bulunamadı.' 
          : 'BBK kodlu görev bulunamadı.',
        total: 0,
        updated: 0
      };
    }

    this.syncStatus = {
      isRunning: true,
      total: tasks.length,
      current: 0,
      updated: 0,
      failed: 0,
      currentBbk: '',
      message: 'Hattat oturumu hazırlanıyor...'
    };

    // Run async in background so HTTP response doesn't hang
    this.runSyncLoop(tasks).catch(err => {
      console.error('[HattatService] Senkronizasyon genel hatası:', err);
      this.syncStatus.isRunning = false;
      this.syncStatus.message = `Hata: ${err.message}`;
    });

    return {
      success: true,
      message: `${tasks.length} adet BBK için sorgulama başlatıldı.`,
      status: this.syncStatus
    };
  }

  async runSyncLoop(tasks) {
    try {
      await this.ensureSession();
      this.syncStatus.message = 'Sorgulamalar başladı...';

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        this.syncStatus.current = i + 1;
        this.syncStatus.currentBbk = task.BbkKodu;
        this.syncStatus.message = `[${i + 1}/${tasks.length}] BBK: ${task.BbkKodu} sorgulanıyor...`;

        try {
          const res = await this.queryBbk(task.BbkKodu);

          if (res.found && res.address) {
            db.updateTaskAddressAndCoords(task.TaskId, {
              HizmetAdresi: res.address,
              Latitude: res.latitude || task.Latitude,
              Longitude: res.longitude || task.Longitude,
              Santral: res.santral || task.Santral,
              Amirlik: res.amirlik || task.Amirlik
            });
            this.syncStatus.updated++;
          } else {
            this.syncStatus.failed++;
          }
        } catch (err) {
          console.warn(`[HattatService] Görev ${task.TaskId} (BBK: ${task.BbkKodu}) sorgulanamadı:`, err.message);
          this.syncStatus.failed++;
        }

        // Polite delay between queries (100ms)
        await new Promise(r => setTimeout(r, 100));
      }

      this.syncStatus.message = `Tamamlandı! ${this.syncStatus.updated} adres güncellendi, ${this.syncStatus.failed} bulunamadı/hatalı.`;
    } catch (err) {
      this.syncStatus.message = `İşlem durdu: ${err.message}`;
    } finally {
      this.syncStatus.isRunning = false;
      this.syncStatus.currentBbk = '';
    }
  }

  getStatus() {
    return {
      ...this.syncStatus,
      isSessionActive: !!(this.hattatPage && !this.hattatPage.isClosed()),
      lastLoginTime: this.lastLoginTime
    };
  }

  async close() {
    if (this.browser) {
      try { await this.browser.close(); } catch (e) { }
      this.browser = null;
      this.hattatPage = null;
    }
  }
}

const hattatServiceInstance = new HattatService();
module.exports = hattatServiceInstance;
