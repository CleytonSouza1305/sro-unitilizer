import puppeteer, { Browser } from "puppeteer";

export interface Unitizer {
  number: string;
  unitilizer: string;
  destination: string;
  date: string;
  objects: { data: string[]; quantity: number };
}

export interface UnitizerRotulos {
  direction: string;
  position: number;
  quantity: number;
  format: string;
  category: string;
}

class PuppeteerService {
  private browser: Browser | null = null;
  private isLogged = false;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      console.log("[PUPPETEER] Iniciando/Reiniciando navegador...");

      this.browser = await puppeteer.launch({
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
    const maxTentativas = 3;

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let t = 1; t <= maxTentativas; t++) {
      const page = await browser.newPage();

      try {
        if (t > 1) {
          const waitTIme = (t + 1) * 5000;
          console.warn(
            `[Aviso] Conexão resetada anteriormente. Aguardando ${waitTIme / 1000}s antes da tentativa ${t}...`,
          );
          await delay(waitTIme);
        }

        console.log(
          `[SRO] Tentando conectar e logar (Tentativa ${t}/${maxTentativas})...`,
        );

        await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
        await page.waitForSelector("a.logo", { visible: true, timeout: 20000 });

        await Promise.all([
          page.click("a.logo"),
          page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }),
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
            page
              .waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 })
              .catch(() => {}),
          ]);
        }

        this.isLogged = true;
        console.log("[SRO] Logado com sucesso!");

        await page.close();
        return this.isLogged;
      } catch (error: any) {
        console.error(`[Erro] Falha na tentativa ${t}:`, error.message);

        await page.close();

        if (t === maxTentativas) {
          throw new Error(
            `Falha definitiva ao conectar no SRO após ${maxTentativas} tentativas. Motivo: ${error.message}`,
          );
        }
      }
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
          unitilizer,
        };
      }
    } finally {
      await page.close();
    }
  }

  async searchUnitilizer(url: string) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    page.on("console", (msg) => {
      console.log(`[LOG DO NAVEGADOR]:`, msg.text());
    });

    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForSelector("#matricula", { visible: true });

      await page.waitForSelector("#btn-rotulos", { visible: true });

      await page.click("#btn-rotulos");

      const finalData = await page.evaluate(() => {
        const content = document.getElementById("tabela-rotulos");
        if (!content) return [];

        const tbody = content.querySelector("tbody");
        if (!tbody) return [];

        const rows = Array.from(tbody.children);
        const unitizerDataRotulos: UnitizerRotulos[] = [];

        console.log(tbody.children);

        rows.forEach((row) => {
          const elData = Array.from(row.children);

          const direction = elData[1]?.textContent?.trim() || "";
          const category = elData[2]?.textContent?.trim() || "";
          const format = elData[3]?.textContent?.trim() || "";

          const position = Number(elData[5]?.textContent) || 0;
          const quantity = Number(elData[8]?.textContent) || 0;

          unitizerDataRotulos.push({
            category,
            direction,
            format,
            position,
            quantity,
          });
        });

        return unitizerDataRotulos;
      });

      return finalData;
    } finally {
      await page.close();
    }
  }
}

export const puppeteerService = new PuppeteerService();
