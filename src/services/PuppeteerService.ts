import { config } from "dotenv";
import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";

config();
export interface Unitizer {
  number: string;
  unitilizer: string;
  destination: string;
  date: string;
  objects: { data: string[]; quantity: number };
}

interface fileJson {
  idEstacao: number;
  nomeArquivo: string;
  idDirecao: string;
  categoria: string;
  tipo: string;
  celula: string;
  abertura: number;
  qtdAbertura: number;
  isGerarTodos: string;
  async: boolean;
  leitor: string;
  posicao: number;
  tipoUnitizador: string;
}

export interface UnitizerRotulos {
  direction: string;
  position: string | number;
  quantity: number;
  format: string;
  category: string;
}

class PuppeteerService {
  private browser: Browser | null = null;
  private isLogged = false;
  private user = process.env.PUPPETEER_USER;
  private pass = process.env.PUPPETEER_PASS;
  private url = process.env.SCRAPE_URL;
  private session_cookie: string | null = null;

  private createBodyData(fileJson: fileJson): URLSearchParams {
    const bodyParams = new URLSearchParams();
    bodyParams.append("acao", "estacao-gerar-rotulos");
    bodyParams.append("dados[idEstacao]", fileJson.idEstacao.toString());
    bodyParams.append("dados[nomeArquivo]", fileJson.nomeArquivo);
    bodyParams.append("dados[idDirecao]", fileJson.idDirecao);
    bodyParams.append("dados[categoria]", fileJson.categoria);
    bodyParams.append("dados[tipo]", fileJson.tipo);
    bodyParams.append("dados[celula]", fileJson.celula);
    bodyParams.append("dados[abertura]", fileJson.abertura.toString());
    bodyParams.append("dados[qtdAbertura]", "1");
    bodyParams.append("dados[isGerarTodos]", "N");
    bodyParams.append("dados[async]", "true");
    bodyParams.append("dados[leitor]", "N");
    bodyParams.append("dados[posicao]", fileJson.posicao.toString());
    bodyParams.append("dados[tipoUnitizador]", "MLA 04");
    bodyParams.append("dados[isEtiquetaTermica]", "false");
    bodyParams.append("dados[qtdCopiasDias]", "1");
    bodyParams.append("dados[qtdCopiaSelecionada]", "1");
    bodyParams.append("dados[rotulos][codSroSistema]", "70000049");
    bodyParams.append("dados[rotulos][codSroOrig]", "04007971");
    bodyParams.append("dados[rotulos][tipoEvento]", "RO");
    bodyParams.append("dados[rotulos][impressoraTermica]", "N");
    bodyParams.append("dados[rotulos][rotulos][0][codSroDest]", "0");
    bodyParams.append("dados[rotulos][rotulos][0][unitizador]", "");
    bodyParams.append("dados[rotulos][rotulos][0][siglaUnitizador]", "UB");
    bodyParams.append("dados[rotulos][rotulos][0][tipoUnitizador]", "MLA 04");
    bodyParams.append(
      "dados[rotulos][rotulos][0][nomeSubRegiaoDest]",
      "GENERATED_BY_SYSTEM",
    );
    bodyParams.append("dados[rotulos][rotulos][0][linhaTransporte]", "");
    bodyParams.append("dados[rotulos][rotulos][0][horarioLinha]", "");
    bodyParams.append(
      "dados[rotulos][rotulos][0][posicao]",
      fileJson.posicao.toString(),
    );
    bodyParams.append("dados[rotulos][rotulos][0][celula]", "UNICA");
    bodyParams.append(
      "dados[rotulos][rotulos][0][categoria]",
      fileJson.categoria,
    );
    bodyParams.append("dados[rotulos][rotulos][0][formato]", fileJson.tipo);
    bodyParams.append("dados[rotulos][rotulos][0][box]", "");
    bodyParams.append("dados[rotulos][rotulos][0][idEstacao]", "1");
    bodyParams.append("dados[rotulos][rotulos][0][qtdCopias]", "1");
    return bodyParams;
  }

  private async processDownloadPdf(unitizers: fileJson[]): Promise<void> {
    const relativePath = "../temp";
    const absoluteFilePath = path.join(import.meta.dirname, relativePath);
    const absoluteDirPath = path.dirname(absoluteFilePath);

    if (!fs.existsSync(absoluteDirPath)) {
      fs.mkdirSync(absoluteDirPath, { recursive: true });
    }

    if (!this.session_cookie) {
      console.log(
        `[COOKIE] Sessão expirada ou vazia para a URL: ${this.url}. Efetuando login...`,
      );
      await this.connectAndLogin();
    }

    for (const unitizer of unitizers) {
      const fileName = unitizer.nomeArquivo;
      const bodyParams = this.createBodyData(unitizer);

      console.log(`[SRO] Iniciando download do arquivo: ${fileName}...`);

      const response = await fetch("https://sroweb.correios.com.br/app/expedicao/expedicaoagencia/controller.php", {
        method: "POST",
        headers: {
          Cookie: this.session_cookie!,
        },
        body: bodyParams,
      });

      if (!response.ok) {
        throw new Error(`Erro na conexão HTTP: ${response.status}`);
      }

      const result = await response.json();
      const recibo = result.id;
      const rotulo = result.dados.nomeArquivo;
      const urlDownload = `https://sroweb.correios.com.br/app/expedicao/expedicaoagencia/rotulo.php?recibo=${recibo}&rotulo=${rotulo}`;

      console.log(
        `[SRO] Baixando PDF de forma segura pelo navegador do Puppeteer...`,
      );
      // CONTINUAR AQUI A LÓGICA PARA BAIXAR...
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      console.log("[PUPPETEER] Iniciando/Reiniciando navegador...");

      this.browser = await puppeteer.launch({
        headless: false,
        devtools: true,
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

  private async connectAndLogin() {
    if (this.isLogged && this.session_cookie) {
      return this.session_cookie;
    }

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

        await page.goto(this.url, {
          waitUntil: "networkidle2",
          timeout: 45000,
        });
        await page.goto(this.url, {
          waitUntil: "networkidle2",
          timeout: 45000,
        });
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
          await page.type(`#${ids[0]}`, this.user);
          await page.type(`#${ids[1]}`, this.pass);

          await Promise.all([
            page.click("button.primario"),
            page
              .waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 })
              .catch(() => {}),
          ]);
        }

        this.isLogged = true;
        console.log("[SRO] Logado com sucesso!");

        const puppeteerCookies = await page.cookies();
        const cookieString = puppeteerCookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; ");

        this.session_cookie = cookieString;

        await page.close();
        return this.isLogged;
      } catch (error: any) {
        console.log(error);
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

  async getUnitilizer() {
    try {
      if (!this.isLogged) await this.connectAndLogin()

      const response = await fetch(`https://sroweb.correios.com.br/app/expedicao/expedicaoagencia/controller.php?acao=estacao-unitizadores-itens&dados%5BcodSroOrig%5D=04007971&dados%5BexpNaoFinalizada%5D=0&_=1783442985059`, {
        method: 'GET',
        headers: {
          Cookie: this.session_cookie!,
        },
      })

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados, status: ${response.status}`)
      }

      if (response.status === 401) {
        await this.connectAndLogin()
      }

      const data = await response.json()
      return data;
    } catch (e) {
      console.log(`[ERROR] Erro inesperado ao buscar por unitilizadores:\n${e.message}`)
    }
  }

  async closeUnitilizer(unitilizer: string) {
    if (!this.isLogged) await this.connectAndLogin();

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    page.on("console", (msg) => {
      console.log(`[LOG DO NAVEGADOR]:`, msg.text());
    });

    try {
      await page.goto(this.url, { waitUntil: "networkidle2" });
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

  async searchUnitilizer() {
    if (!this.isLogged) await this.connectAndLogin();

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    page.on("console", (msg) => {
      console.log(`[LOG DO NAVEGADOR]:`, msg.text());
    });

    try {
      await page.goto(this.url, { waitUntil: "networkidle2" });
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

          const position = elData[5]?.textContent || 0;
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

  async downloadUnit(itemsForDownload: string[]): Promise<fileJson[]> {
    if (!this.isLogged) await this.connectAndLogin();

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    page.on("console", (msg: any) => {
      console.log(`[LOG DO NAVEGADOR]:`, msg.text());
    });

    const unitizersFound: fileJson[] = [];

    try {
      await page.goto(this.url, { waitUntil: "networkidle2" });
      await page.waitForSelector("#btn-rotulos", { visible: true });
      await page.click("#btn-rotulos");

      const labelsData: (fileJson | null)[] = await page.$$eval(
        "a.imprimir",
        (elements) => {
          return elements.map((el) => {
            const dataString = el.getAttribute("data_direcao_gerar_rotulos");
            console.log(dataString);
            return dataString ? JSON.parse(dataString) : null;
          });
        },
      );

      for (const item of itemsForDownload) {
        const labelsMatched = labelsData.filter(
          (label): label is fileJson =>
            label !== null && label.posicao?.toString() === item.toString(),
        );

        if (labelsMatched.length > 0) {
          unitizersFound.push(...labelsMatched);
        }
      }

      console.log("Itens encontrados para download:", unitizersFound);

      if (unitizersFound.length > 0) {
        await this.processDownloadPdf(unitizersFound);
      }

      return unitizersFound;
    } catch (error) {
      console.error("[DOWNLOAD_ERROR]: Falha ao baixar unitilizadores:", error);
      throw error;
    } finally {
      await page.close();
    }
  }
}

export const puppeteerService = new PuppeteerService();
