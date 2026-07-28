import { config } from "dotenv";
import puppeteer, { Browser } from "puppeteer";
import { createRequire } from "node:module";
import { Unitizer } from "../model/Unitilizer";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

config();

export interface FileJson {
  idEstacao: number;
  nomeArquivo: string;
  idDirecao: string;
  categoria: string;
  tipo: string;
  celula: string;
  abertura: number;
  posicao: number;
  qtdAbertura: number,
  isGerarTodos: string,
  async: boolean,
  leitor: string,
  tipoUnitizador: string
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

  private async createBodyData(fileJson: FileJson) {
    const allUnitis = await this.searchUnitilizer();
    const unit = allUnitis.find(
      (e) => e.position.toString() === fileJson.posicao.toString(),
    );

    const codSroDest = fileJson.nomeArquivo.split("_")[0]
 
    const bodyParams = new URLSearchParams();

    bodyParams.append("acao", "estacao-gerar-rotulos");
    bodyParams.append("dados[idEstacao]", fileJson.idEstacao.toString());
    bodyParams.append("dados[nomeArquivo]", fileJson.nomeArquivo);
    bodyParams.append("dados[idDirecao]", fileJson.idDirecao);
    bodyParams.append("dados[categoria]", fileJson.categoria);
    bodyParams.append("dados[tipo]", fileJson.tipo);
    bodyParams.append("dados[celula]", fileJson.celula);
    bodyParams.append("dados[abertura]", fileJson.abertura.toString());
    bodyParams.append("dados[qtdAbertura]", fileJson.qtdAbertura.toString());
    bodyParams.append("dados[isGerarTodos]", fileJson.isGerarTodos);
    bodyParams.append("dados[async]", fileJson.async.toString());
    bodyParams.append("dados[leitor]", fileJson.leitor);
    bodyParams.append("dados[posicao]", fileJson.posicao.toString());
    bodyParams.append("dados[tipoUnitizador]", fileJson.tipoUnitizador);
    bodyParams.append("dados[isEtiquetaTermica]", "false");
    bodyParams.append("dados[qtdCopiasDias]", "1");
    bodyParams.append("dados[qtdCopiaSelecionada]", "1");
    bodyParams.append("dados[rotulos][codSroSistema]", "70000049");
    bodyParams.append("dados[rotulos][codSroOrig]", "04007971");
    bodyParams.append("dados[rotulos][tipoEvento]", "RO")
    bodyParams.append("dados[rotulos][impressoraTermica]", "N");
    bodyParams.append("dados[rotulos][rotulos][0][codSroDest]", codSroDest);
    bodyParams.append("dados[rotulos][rotulos][0][unitizador]", "");
    bodyParams.append("dados[rotulos][rotulos][0][siglaUnitizador]", "UB");
    bodyParams.append("dados[rotulos][rotulos][0][tipoUnitizador]", fileJson.tipoUnitizador);
    bodyParams.append("ddados[rotulos][rotulos][0][nomeSubRegiaoDest]", unit.direction);
    bodyParams.append("dados[rotulos][rotulos][0][linhaTransporte]", "");
    bodyParams.append("dados[rotulos][rotulos][0][horarioLinha]", "");
    bodyParams.append("dados[rotulos][rotulos][0][posicao]", fileJson.posicao.toString());
    bodyParams.append("dados[rotulos][rotulos][0][celula]", fileJson.celula);
    bodyParams.append("dados[rotulos][rotulos][0][categoria]", fileJson.categoria);
    bodyParams.append("dados[rotulos][rotulos][0][formato]", fileJson.tipo);
    bodyParams.append("dados[rotulos][rotulos][0][box]", "");
    bodyParams.append("dados[rotulos][rotulos][0][idEstacao]", fileJson.idEstacao.toString());
    bodyParams.append("dados[rotulos][rotulos][0][qtdCopias]", "1");

    return { body: bodyParams, direction: unit.direction };
  }

  private async readPdf(response: Response): Promise<string | null> {
    let arrayBuffer: ArrayBuffer | null = await response.arrayBuffer();
    let buffer: Buffer | null = Buffer.from(arrayBuffer);
    arrayBuffer = null;

    try {
      const parser = new pdf.PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = result.text;

      const regexUnitizador = /[A-Z]{2}\d{9}/;
      const match = text.match(regexUnitizador);

      return match ? match[0] : null;
    } finally {
      buffer = null;
    }
  }

  private async processDownloadPdf(unitizers: FileJson[]) {
    try {
      if (!this.session_cookie) {
        console.log(
          `[COOKIE] Sessão expirada ou vazia para a URL: ${this.url}. Efetuando login...`,
        );
        await this.connectAndLogin();
      }

      const unitizadores = [];
      for (const unitizer of unitizers) {
        const fileName = unitizer.nomeArquivo;
        const bodyParams = await this.createBodyData(unitizer);
        const { body } = bodyParams

        console.log(`[SRO] Iniciando download do arquivo: ${fileName}...`);

        const response = await fetch(
          "https://sroweb.correios.com.br/app/expedicao/expedicaoagencia/controller.php",
          {
            method: "POST",
            headers: {
              Cookie: this.session_cookie!,
            },
            body
          },
        );

        if (!response.ok) {
          throw new Error(`Erro na conexão HTTP: ${response.status}`);
        }

        const result = await response.json();
        const recibo = result.id;
        const rotulo = result.dados.nomeArquivo;
        const urlDownload = `https://sroweb.correios.com.br/app/expedicao/expedicaoagencia/rotulo.php?recibo=${recibo}&rotulo=${rotulo}`;

        console.log(
          `[SRO] Baixando PDF de forma segura via requisição HTTP...`,
        );

        const pdfFetchResponse = await fetch(urlDownload, {
          method: "GET",
          headers: {
            Cookie: this.session_cookie!,
          },
        });

        if (!pdfFetchResponse.ok) {
          throw new Error(
            `Falha ao baixar PDF: status ${pdfFetchResponse.status}`,
          );
        }

        const contentType = pdfFetchResponse.headers.get("content-type") || "";
        if (!contentType.includes("application/pdf")) {
          throw new Error(
            `Impedido de baixar o arquivo: ${rotulo}, não retornou um PDF válido!`,
          );
        }

        const unitizador = await this.readPdf(pdfFetchResponse);

        if (unitizador) unitizadores.push({ unitizador, data: unitizer, direction: bodyParams.direction });
      }

      return unitizadores;
    } catch (e) {
      console.error(`[FAILED_DOWNLOAD]: ${e.message}`);
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

  private async openUnitizador(unitizador: string, direction?: string) {
    try {
      const timestamp = Date.now();
      const url = `https://sroweb.correios.com.br/app/expedicao/expedicaoagencia/controller.php?acao=estacao-validar-rotulo-unitizador&dados%5BcodSroOrig%5D=04007971&dados%5BnumeroUnitizador%5D=${unitizador}&_=${timestamp}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Cookie: this.session_cookie!,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Falha ao validar unitizador: status ${response.status}`,
        );
      }

      const json = await response.json()
      
      const params = new URLSearchParams();

      params.append("acao", "estacao-gravar-unitizador")
      params.append("dados[id]", "")
      params.append("dados[idEstacao]", json.idEstacao)
      params.append("dados[data]", json.dtHrgeracao)
      params.append("dados[evento]", json.evento)
      params.append("dados[unitizador]", json.id)
      params.append("dados[peso]", "0")
      params.append("dados[matricula]", this.user)
      params.append("dados[celula]", json.celula)
      params.append("dados[subCelula]", "1")
      params.append("dados[posicao]", json.posicao)
      params.append("dados[codSroOrig]", json.codSroOrig)
      params.append("dados[codSroDest]", json.codSroDest)
      params.append("dados[noEstacao]", json.codSroOrig)
      params.append("dados[turno]", "1")
      params.append("dados[plano]", direction)
      params.append("dados[categoria]", json.categoria.toUpperCase())
      params.append("dados[formato]", json.formato.toUpperCase())
      params.append("dados[direcao]", direction)
      params.append("dados[versao_plano]", "0")
      params.append("dados[inTipoVolumoso]", "N")
      params.append("dados[inTipoExpedicao]", "R")
      params.append("dados[expGeolocation]", "N")
      params.append("dados[descricaoMatrizDirecao]", "NAOINFORMADO")

      const isOpen = await fetch("https://sroweb.correios.com.br/app/expedicao/expedicaoagencia/controller.php", {
        method: "POST",
        headers: {
          Cookie: this.session_cookie!,
        },
        body: params
      });

      const data = await isOpen.json()
      return data
    } catch (e) {
      console.error(`Erro ao abrir unitizador: ${e.message}`);
    }
  }

  async getUnitilizer(retryCount = 0): Promise<Unitizer[]> {
    try {
      if (!this.isLogged) await this.connectAndLogin();

      const url = `https://sroweb.correios.com.br/app/expedicao/expedicaoagencia/controller.php?acao=estacao-unitizadores-itens&dados%5BcodSroOrig%5D=04007971&dados%5BexpNaoFinalizada%5D=0&_=1783442985059`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Cookie: this.session_cookie!,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Erro HTTP ao buscar dados, status: ${response.status}`,
        );
      }

      const data = await response.json();

      if (data.erro) {
        if (retryCount >= 2) {
          console.log(
            "[SRO] Erro persistente após tentativas de relogin, desistindo.",
          );
          return [];
        }

        console.log("[SRO] Sessão inválida, relogando e tentando novamente...");
        this.isLogged = false;
        await this.connectAndLogin();
        return this.getUnitilizer(retryCount + 1);
      }

      return data;
    } catch (e) {
      console.log(
        `[ERROR] Erro inesperado ao buscar por unitilizadores:\n${e.message}`,
      );
      return [];
    }
  }

  async closeUnitilizerPuppeteer(unitilizer: string) {
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

  async downloadUnit(itemsForDownload: string[]) {
    if (!this.isLogged) await this.connectAndLogin();

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    page.on("console", (msg: any) => {
      console.log(`[LOG DO NAVEGADOR]:`, msg.text());
    });

    const unitizersFound: FileJson[] = [];

    try {
      await page.goto(this.url, { waitUntil: "networkidle2" });
      await page.waitForSelector("#btn-rotulos", { visible: true });
      await page.click("#btn-rotulos");

      const labelsData: (FileJson | null)[] = await page.$$eval(
        "a.imprimir",
        (elements) => {
          return elements.map((el) => {
            const dataString = el.getAttribute("data_direcao_gerar_rotulos");
            return dataString ? JSON.parse(dataString) : null;
          });
        },
      );

      const oppened: {
      oppeneds: {
        message: string;
        unitilizer: string;
      }[];
      error: { unitilizer: string; reason: string }[];
    } = {
      oppeneds: [],
      error: [],
    };

      for (const item of itemsForDownload) {
        const labelsMatched = labelsData.filter(
          (label): label is FileJson =>
            label !== null && label.posicao?.toString() === item.toString(),
        );

        if (labelsMatched.length > 0) {
          unitizersFound.push(...labelsMatched);
        }
      }

      if (unitizersFound.length > 0) {
        const avaliableUnits = await this.processDownloadPdf(unitizersFound);

        if (avaliableUnits.length > 0) {
          for (const unit of avaliableUnits) {
            const message = await this.openUnitizador(unit.unitizador, unit.direction);
            
            if (message.erro) {
              oppened.error.push({ 
                reason: message.mensagem.split(':')[1], unitilizer: unit.unitizador 
              })
            } else {
              oppened.oppeneds.push({
                message: `Unitizador "${message.unitizador}" para direção ${message.plano ?? message.direcao} aberto com sucesso!`,
                unitilizer: unit.unitizador
              })
            }
          }
        }

        return oppened
      }
    } catch (error) {
      console.error("[DOWNLOAD_ERROR]: Falha ao baixar unitilizadores:", error);
      throw error;
    } finally {
      await page.close();
    }
  }
}

export const puppeteerService = new PuppeteerService();
