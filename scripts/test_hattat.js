const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const LOGIN_URL = 'https://ttcbs.turktelekom.com.tr/Login';
const IDENTITY = '00732366';
const PASSWORD = 'Turktelekom2030';
const TEST_BBK = '38625596';

async function testHattat() {
  console.log('--- HATTAT TEST BAŞLADI ---');
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--disable-web-security'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('1. Login sayfasına gidiliyor:', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Mevcut URL:', page.url());

    // Fill login inputs
    console.log('2. Kimlik bilgileri dolduruluyor...');
    await page.waitForSelector('input[name="Identity"]', { timeout: 10000 });
    await page.type('input[name="Identity"]', IDENTITY);
    await page.type('input[name="Detail.Password"]', PASSWORD);

    // Submit form (find submit button or press Enter)
    console.log('3. Giriş yapılıyor...');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], form button, .btn-primary');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        submitBtn.click()
      ]);
    } else {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.keyboard.press('Enter')
      ]);
    }

    console.log('Giriş sonrası URL:', page.url());

    // 4. Look for Hattat button / link: a[href*="RedirectApp/76"]
    console.log('4. HaTTat uygulaması aranıyor...');
    await page.waitForSelector('a[href*="RedirectApp/76"]', { timeout: 15000 });
    
    const hattatUrl = await page.evaluate(() => {
      const a = document.querySelector('a[href*="RedirectApp/76"]');
      return a ? a.href : null;
    });
    console.log('Hattat Redirect URL:', hattatUrl);

    // Open Hattat redirect in a new page
    const hattatPage = await browser.newPage();
    await hattatPage.setViewport({ width: 1280, height: 800 });
    console.log('5. HaTTat sayfasına gidiliyor:', hattatUrl);
    await hattatPage.goto(hattatUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    console.log('HaTTat Sayfa URL:', hattatPage.url());

    // 6. Test querying the BBK
    console.log(`6. Test BBK (${TEST_BBK}) sorgulanıyor...`);

    // Let's first test if fetch works directly inside hattatPage context
    const apiResult = await hattatPage.evaluate(async (bbk) => {
      try {
        const res = await fetch('https://hattat.turktelekom.com.tr/WebMethodPage.aspx/BbkBilgisiAnaliziniGetir', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({ bbk: String(bbk), tip: '0' })
        });
        const json = await res.json();
        return { success: true, data: json };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }, TEST_BBK);

    console.log('API Sonucu:', JSON.stringify(apiResult, null, 2));

    // If direct fetch returns data, analyze it!
    if (apiResult.success && apiResult.data) {
      console.log('*** API BAŞARILI! ***');
    } else {
      console.log('Direct API dönmedi veya hata aldı, UI üzerinden denenecek...');
      // Try UI navigation: look for txtSorgu
      const hasInput = await hattatPage.$('#txtSorgu');
      console.log('#txtSorgu var mı:', !!hasInput);
    }

  } catch (err) {
    console.error('Hata oluştu:', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testHattat();
