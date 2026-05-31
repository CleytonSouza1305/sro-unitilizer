import puppeteer, { Browser } from "puppeteer";

export interface Unitizer {
  number: string;
  unitilizer: string;
  destination: string;
  date: string;
  objects: { data: string[]; quantity: number };
}

class PuppeteerService {
  private browser: Browser | null = null;
  private isLogged = false;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      console.log("[PUPPETEER] Iniciando/Reiniciando navegador...");

      this.browser = await puppeteer.launch({
        headless: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      this.browser.on("disconnected", () => {
        console.warn("[PUPPETEER] Conexão perdida. Limpando instâncias...");
        this.browser = null;
        this.isLogged = false;
      });
    }

    return this.browser;
  }

  async connectAndLogin(url: string, user: string, pass: string) {
    if (this.isLogged) return this.isLogged;

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
      return this.isLogged;
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
        const link = document.querySelector(
          seletor,
        ) as HTMLAnchorElement | null;
        if (link) link.click();
      }, linkSelector);

      await page.waitForSelector("#btn-objetos", { visible: true });

      await page.click("#btn-objetos");
      const finalData = await page.evaluate(() => {
        const cards = document.querySelectorAll(".card");
        const unitizerData: Unitizer[] = [];

        cards.forEach((el) => {
          const elData = Array.from(el.children) as HTMLElement[];

          const splitedData = elData[3].innerText.split(" ");

          const number = elData[0]?.innerText || "";
          const destination = elData[1]?.innerText.includes(":")
            ? elData[1].innerText.split(":")[1].trim()
            : "";
          const unitilizer = elData[2]?.innerText.includes(":")
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
            unitilizer,
            destination,
            date,
            objects: { data: objects, quantity: objects.length },
          });
        });

        return unitizerData;
      });

      return finalData;
    } finally {
      await page.close();
    }
  }

  async closeUnitilizer(url: string, unitilizer: string) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    page.on("console", (msg) => {
      console.log(`[LOG DO NAVEGADOR]:`, msg.text());
    });

    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForSelector("#matricula", { visible: true });

      await page.type("#matricula", unitilizer);
      await page.keyboard.press("Enter");

      const seletorMensagem = "#sub-mensagem_princial";

      await page.waitForSelector(seletorMensagem, { visible: true });
      const statusTexto = await page.$eval(
        seletorMensagem,
        (el) => el.textContent?.trim() || "",
      );

      const mensagemSucessoPrimeiraLeitura = `Unitizador ${unitilizer} aberto, leia novamente para fechar`;

      if (
        statusTexto.includes(mensagemSucessoPrimeiraLeitura) ||
        statusTexto.includes("leia novamente para fechar")
      ) {
        await page.click("#matricula");
        await page.keyboard.down("Control");
        await page.keyboard.press("A");
        await page.keyboard.up("Control");
        await page.keyboard.press("Backspace");

        await page.type("#matricula", unitilizer);
        await page.keyboard.press("Enter");

        return {
          success: true,
          unitilizer
        };
      }
    } finally {
      await page.close();
    }
  }
}

export const puppeteerService = new PuppeteerService();
