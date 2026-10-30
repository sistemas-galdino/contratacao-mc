// Gera docs/Guia-de-Instalacao.pdf a partir de docs/INSTALACAO.md (capa, sumário e estilo de impressão).
// Precisa do Google Chrome instalado; em outro caminho, informe CHROME_PATH.
//
//   npm run guia:pdf
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { marked } from "marked";

const SOURCE = resolve("docs/INSTALACAO.md");
const OUTPUT = resolve("docs/Guia-de-Instalacao.pdf");

const CHROME_CANDIDATES = [
  process.env["CHROME_PATH"],
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
if (!chrome) {
  console.error(
    "\n✖ Google Chrome não encontrado. Instale o Chrome ou informe o caminho em CHROME_PATH.\n",
  );
  process.exit(1);
}

const month = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const edition = month.charAt(0).toUpperCase() + month.slice(1);

let md = readFileSync(SOURCE, "utf8");

// A capa substitui o título principal.
md = md.replace(/^# .*\n/, "");

const sections = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
const slug = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const renderer = new marked.Renderer();
renderer.heading = function ({ tokens, depth, text }) {
  let inner = this.parser.parseInline(tokens);
  inner = inner
    .replace(/\((Você \+ Assistente)\)/, '<span class="who both">Você + Assistente</span>')
    .replace(/\((Você)\)/, '<span class="who you">Você</span>')
    .replace(/\((Assistente)\)/, '<span class="who ai">Assistente</span>');
  if (depth === 2) {
    const match = text.match(/^(\d+)\.\s*(.*)$/);
    const appendix = /^Apêndice/.test(text);
    const cls = appendix ? "section appendix" : "section";
    if (match) {
      inner = inner.replace(/^\d+\.\s*/, "");
      return `<h2 id="${slug(text)}" class="${cls}"><span class="num">${match[1]}</span>${inner}</h2>`;
    }
    return `<h2 id="${slug(text)}" class="${cls}">${inner}</h2>`;
  }
  return `<h${depth}>${inner}</h${depth}>`;
};

let body = marked.parse(md, { renderer, gfm: true });

// Rótulos "Você" / "Assistente" em negrito no texto viram selos.
body = body
  .replace(/<strong>Você:<\/strong>/g, '<span class="who you">Você</span>')
  .replace(/<strong>Assistente:<\/strong>/g, '<span class="who ai">Assistente</span>');

const toc = sections
  .map((s) => {
    const m = s.match(/^(\d+)\.\s*(.*)$/);
    const label = (m ? m[2] : s).replace(/\s*\((Você|Assistente|Você \+ Assistente)\)/, "");
    return `<li><a href="#${slug(s)}"><span class="toc-num">${m ? m[1] : "+"}</span>${label}</a></li>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Guia de instalação — Vetor</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #111111;
    --soft: #5c5c56;
    --line: #e4e4dc;
    --wash: #f6f6f1;
    --brand: #d4fc67;
    --brand-deep: #9cc93a;
    --brand-soft: #f1fbd6;
    --teal: #1f8f6e;
  }
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-left { content: "Vetor · Guia de instalação"; font: 8pt "IBM Plex Sans", sans-serif; color: #8a8a82; }
    @bottom-right { content: counter(page) " / " counter(pages); font: 8pt "IBM Plex Sans", sans-serif; color: #8a8a82; }
  }
  @page cover { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 10.2pt/1.55 "IBM Plex Sans", system-ui, sans-serif; color: var(--ink); background: #fff; }

  .cover { page: cover; height: 297mm; width: 210mm; background: #0b0b0b; color: #f3f3f3; position: relative; padding: 30mm 22mm; break-after: page; overflow: hidden; }
  .cover .glow { position: absolute; width: 150mm; height: 150mm; border-radius: 50%; background: radial-gradient(circle, rgba(212,252,103,.28), rgba(212,252,103,0) 65%); right: -45mm; top: -35mm; }
  .cover .glow2 { position: absolute; width: 120mm; height: 120mm; border-radius: 50%; background: radial-gradient(circle, rgba(143,227,201,.16), rgba(143,227,201,0) 65%); left: -40mm; bottom: -30mm; }
  .brandmark { display: flex; align-items: center; gap: 4mm; position: relative; }
  .logo { width: 13mm; height: 13mm; border-radius: 3.5mm; background: var(--brand); color: #000; display: grid; place-items: center; font: 700 20pt "Bricolage Grotesque", sans-serif; }
  .brandmark p { margin: 0; line-height: 1.2; }
  .brandmark .name { font: 600 15pt "Bricolage Grotesque", sans-serif; }
  .brandmark .tag { font-size: 9pt; color: #9b9b93; }
  .cover h1 { position: relative; margin: 62mm 0 0; font: 700 44pt/1.02 "Bricolage Grotesque", sans-serif; letter-spacing: -0.02em; max-width: 150mm; }
  .cover h1 em { font-style: normal; color: var(--brand); }
  .cover .lead { position: relative; margin-top: 9mm; font-size: 13pt; line-height: 1.5; color: #cfcfc8; max-width: 140mm; }
  .cover .steps { position: relative; display: flex; gap: 3mm; margin-top: 14mm; flex-wrap: wrap; }
  .cover .steps span { border: 1px solid #3a3a36; border-radius: 99px; padding: 1.6mm 4mm; font-size: 9pt; color: #e6e6df; }
  .cover .steps span b { color: var(--brand); font-weight: 600; margin-right: 1.5mm; }
  .cover .meta { position: absolute; left: 22mm; right: 22mm; bottom: 24mm; display: flex; justify-content: space-between; font-size: 8.8pt; color: #8f8f88; border-top: 1px solid #2c2c29; padding-top: 5mm; }
  .cover .meta code { font-family: "IBM Plex Mono", monospace; color: #d9d9d2; background: none; border: 0; padding: 0; }
  a[href^="mailto:"] { text-decoration: none; }
  h2#apendice-a-login-com-google-opcional { break-before: page; }

  .toc { break-after: page; }
  .toc h2 { font: 700 22pt "Bricolage Grotesque", sans-serif; margin: 0 0 2mm; letter-spacing: -0.01em; }
  .toc .sub { color: var(--soft); margin: 0 0 8mm; }
  .toc ol { list-style: none; padding: 0; margin: 0; columns: 1; }
  .toc li { border-bottom: 1px solid var(--line); }
  .toc a { display: flex; align-items: baseline; gap: 4mm; padding: 2.6mm 0; color: var(--ink); text-decoration: none; font-size: 11pt; }
  .toc-num { font: 600 10pt "IBM Plex Mono", monospace; color: var(--brand-deep); width: 8mm; }
  .legend { margin-top: 10mm; display: grid; grid-template-columns: auto 1fr; gap: 3mm 4mm; align-items: center; font-size: 9.6pt; color: var(--soft); background: var(--wash); border-radius: 3mm; padding: 5mm 6mm; }

  main > p:first-child { font-size: 11.5pt; }
  h2.section { font: 700 17pt/1.2 "Bricolage Grotesque", sans-serif; letter-spacing: -0.01em; margin: 9mm 0 3.5mm; padding-top: 4mm; border-top: 2px solid var(--ink); display: flex; align-items: center; gap: 3mm; flex-wrap: wrap; break-after: avoid; }
  h2.section .num { display: inline-grid; place-items: center; min-width: 9mm; height: 9mm; padding: 0 2mm; border-radius: 2.5mm; background: var(--brand); color: #000; font: 700 12pt "Bricolage Grotesque", sans-serif; }
  h2.appendix { border-top-style: dashed; }
  h2.break { break-before: page; }
  h3 { font: 600 11.5pt "Bricolage Grotesque", sans-serif; margin: 5mm 0 2mm; }
  p { margin: 0 0 2.6mm; }
  ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
  li { margin: 0.8mm 0; }
  a { color: var(--ink); }
  strong { font-weight: 600; }
  code { font: 9pt "IBM Plex Mono", monospace; background: var(--wash); border: 1px solid var(--line); border-radius: 1.2mm; padding: 0.2mm 1.2mm; }
  pre { background: #111; color: #eaeae4; border-radius: 2.5mm; padding: 4mm 5mm; margin: 2mm 0 4mm; break-inside: avoid; white-space: pre-wrap; word-break: break-word; }
  pre code { background: none; border: 0; padding: 0; color: inherit; font-size: 8.8pt; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 4.5mm; font-size: 9.3pt; break-inside: auto; }
  tr { break-inside: avoid; }
  th { text-align: left; font-weight: 600; background: var(--ink); color: #fff; padding: 2mm 3mm; }
  th:first-child { border-top-left-radius: 1.5mm; } th:last-child { border-top-right-radius: 1.5mm; }
  td { padding: 2mm 3mm; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:nth-child(even) td { background: #fbfbf8; }
  blockquote { margin: 3mm 0 4mm; padding: 3.5mm 5mm; background: var(--brand-soft); border-left: 3px solid var(--brand-deep); border-radius: 0 2.5mm 2.5mm 0; break-inside: avoid; }
  blockquote p:last-child { margin-bottom: 0; }
  .who { display: inline-block; font: 600 7.8pt/1 "IBM Plex Sans", sans-serif; letter-spacing: .04em; text-transform: uppercase; padding: 1.3mm 2.4mm; border-radius: 99px; vertical-align: middle; margin-right: 1mm; }
  h2 .who { font-size: 7.6pt; }
  .who.you { background: #111; color: var(--brand); }
  .who.ai { background: #dff4ec; color: #145f49; }
  .who.both { background: var(--brand); color: #000; }
</style>
</head>
<body>
<section class="cover">
  <div class="glow"></div><div class="glow2"></div>
  <div class="brandmark"><div class="logo">V</div><div><p class="name">Vetor</p><p class="tag">Recrutamento inteligente</p></div></div>
  <h1>Guia de <em>instalação</em></h1>
  <p class="lead">Do download do repositório ao sistema de contratação funcionando no banco de dados da sua empresa — com o Claude Code ou o Codex fazendo a parte técnica.</p>
  <div class="steps">
    <span><b>1</b>Instalar ferramentas</span><span><b>2</b>Baixar o sistema</span><span><b>3</b>/configurar</span><span><b>4</b>Testar</span><span><b>5</b>Publicar</span>
  </div>
  <div class="meta"><span>Repositório: <code>github.com/sistemas-galdino/contratacao-mc</code></span><span>${edition}</span></div>
</section>
<section class="toc">
  <h2>Conteúdo</h2>
  <p class="sub">Siga na ordem na primeira instalação. Tempo estimado: 30 a 45 minutos.</p>
  <ol>${toc}</ol>
  <div class="legend">
    <span class="who you">Você</span><span>passos feitos por você, no navegador ou no Terminal</span>
    <span class="who ai">Assistente</span><span>o Claude Code ou o Codex faz sozinho; você acompanha e aprova</span>
  </div>
</section>
<main>
${body}
</main>
</body>
</html>`;

const dir = mkdtempSync(join(tmpdir(), "guia-"));
const htmlFile = join(dir, "guia.html");
writeFileSync(htmlFile, html);
try {
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--virtual-time-budget=8000",
      `--print-to-pdf=${OUTPUT}`,
      pathToFileURL(htmlFile).href,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  if (result.status !== 0) {
    console.error(result.stderr?.toString());
    process.exit(result.status ?? 1);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`✔ PDF gerado: docs/Guia-de-Instalacao.pdf (${sections.length} seções)`);
