import puppeteer, { Browser } from 'puppeteer';

interface Unitizer {
  number: string,
  unitizer: string,
  unit: string,
  date: string,
  objects: { data: string[], quantity: number }
}

class PuppeteerService {
  private browser: Browser | null = null;
  private isLogged = false; 

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false, 
        args: ['--no-sandbox']
      });
    }
    return this.browser;
  }

  async connectAndLogin(url: string, user: string, pass: string) {
    if (this.isLogged) return;

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url);
      await page.waitForSelector("a.logo", { visible: true });
      
      await Promise.all([
        page.click("a.logo"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
      ]);

      const ids = await page.evaluate(() => {
        const inputs = document.querySelectorAll(".form-control");
        return Array.from(inputs).map((el) => el.id);
      });

      if (ids.length >= 2) {
        await page.type(`#${ids[0]}`, user);
        await page.type(`#${ids[1]}`, pass);

        await Promise.all([
          page.click("button.primario"),
          page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
        ]);
      }

      this.isLogged = true;
      return this.isLogged
    } finally {
      await page.close(); 
    }
  }

  async getUnitilizer(url: string) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url);
      
      const linkSelector = 'a[href*="expedicaoagencia/index.php"]';
      await page.evaluate(async (seletor) => {
        const link = document.querySelector(seletor) as HTMLAnchorElement | null
        if (link) link.click()
      }, linkSelector);

      await page.waitForSelector("#btn-objetos", { visible: true });

      await page.click("#btn-objetos");
      const finalData = await page.evaluate(() => {
        const cards = document.querySelectorAll(".card");
        const unitizerData: Unitizer[] = []

        cards.forEach((el) => {
          const elData = Array.from(el.children) as HTMLElement[]

          const splitedData = elData[3].innerText.split(" ");

          const number = elData[0]?.innerText || "";
          const unit = elData[1]?.innerText.includes(":")
            ? elData[1].innerText.split(":")[1].trim()
            : "";
          const unitizer = elData[2]?.innerText.includes(":")
            ? elData[2].innerText.split(":")[1].trim()
            : "";
          const date =
            splitedData.length >= 3
              ? `${splitedData[1].trim()} - ${splitedData[2].trim()}`
              : "";

          const table = elData[4];
          const objects = table
            ? Array.from(table.querySelectorAll("tbody tr"))
                .map((row) => {
                  const td = row.querySelectorAll("td")[1];
                  return td ? td.textContent.trim() : "";
                })
                .filter((txt) => txt !== "")
            : [];

          unitizerData.push({
            number,
            unitizer,
            unit,
            date,
            objects: { data: objects, quantity: objects.length },
          });
        });

        return unitizerData;
      });

      return finalData
    } finally {
      await page.close(); 
    }
  }

  // 4. Operação específica: Ver Perfil
  async checkProfile() {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto('URL_DO_PERFIL');
      // Lógica para ver perfil
    } finally {
      await page.close();
    }
  }
}

export const puppeteerService = new PuppeteerService();