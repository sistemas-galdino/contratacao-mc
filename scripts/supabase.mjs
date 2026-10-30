// Liga esta instalação a um projeto do Supabase usando o token de acesso pessoal (sbp_...).
//
//   npm run supabase:conectar -- --ref <ref-do-projeto> --token sbp_... [--senha-banco "..."] [--forcar]
//     espera o projeto ficar pronto, cria as tabelas (migrações), busca as chaves, preenche o .env
//     e fecha o cadastro aberto de contas (só o administrador cria acessos).
//
//   npm run supabase:endereco -- --url https://contratacao-suaempresa.vercel.app --token sbp_...
//     grava APP_URL no .env e libera esse endereço no login do Supabase.
//
// O token também pode vir da variável SUPABASE_ACCESS_TOKEN. Ele não é gravado em lugar nenhum.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";

const API = "https://api.supabase.com";
const LOCAL_URL = "http://localhost:8080";

const [command, ...rest] = process.argv.slice(2);
const { values: opts } = parseArgs({
  args: rest,
  options: {
    ref: { type: "string" },
    token: { type: "string" },
    "senha-banco": { type: "string" },
    url: { type: "string" },
    forcar: { type: "boolean", default: false },
  },
});

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const token = opts.token?.trim() || process.env["SUPABASE_ACCESS_TOKEN"]?.trim();
if (!token)
  fail(
    "Informe o token de acesso do Supabase com --token sbp_... (supabase.com/dashboard/account/tokens).",
  );

async function api(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (response.status === 401)
    fail(
      "Token do Supabase inválido ou expirado. Gere outro em supabase.com/dashboard/account/tokens.",
    );
  if (!response.ok) {
    const detail = typeof data === "object" && data ? (data.message ?? JSON.stringify(data)) : text;
    throw new Error(`${method} ${path} → ${response.status}: ${detail}`);
  }
  return data;
}

// ── .env ────────────────────────────────────────────────────────────────
function readEnvFile() {
  if (existsSync(".env")) return readFileSync(".env", "utf8");
  if (existsSync(".env.example")) return readFileSync(".env.example", "utf8");
  return "";
}

function envValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function writeEnv(values) {
  let content = readEnvFile();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    content = pattern.test(content)
      ? content.replace(pattern, line)
      : `${content.trimEnd()}\n${line}\n`;
  }
  writeFileSync(".env", content, { mode: 0o600 });
}

// ── Supabase ────────────────────────────────────────────────────────────
function cli(args) {
  const result = spawnSync("npx", ["supabase", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
  });
  if (result.status !== 0)
    fail(`O comando "supabase ${args[0]} ${args[1] ?? ""}" falhou (veja a mensagem acima).`);
}

async function waitUntilReady(ref) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const project = await api("GET", `/v1/projects/${ref}`).catch((error) => {
      if (String(error.message).includes("→ 404"))
        fail(`Projeto ${ref} não encontrado nesta conta do Supabase.`);
      throw error;
    });
    if (project.status === "ACTIVE_HEALTHY") return project;
    if (["INACTIVE", "PAUSED"].includes(project.status)) {
      fail(
        `O projeto ${ref} está pausado. Reative em supabase.com/dashboard/project/${ref} e rode de novo.`,
      );
    }
    if (attempt === 0)
      console.log(`Aguardando o projeto ficar pronto (status: ${project.status})…`);
    await sleep(15_000);
  }
  fail("O projeto demorou demais para ficar pronto. Confira no painel do Supabase e rode de novo.");
}

async function publicTables(ref) {
  const rows = await api("POST", `/v1/projects/${ref}/database/query`, {
    query: "select table_name from information_schema.tables where table_schema = 'public'",
  });
  return Array.isArray(rows) ? rows.map((row) => row.table_name) : [];
}

function pickKeys(keys) {
  const publishable =
    keys.find((key) => key.type === "publishable") ?? keys.find((key) => key.name === "anon");
  const secret =
    keys.find((key) => key.type === "secret") ?? keys.find((key) => key.name === "service_role");
  if (!publishable?.api_key || !secret?.api_key)
    fail("Não encontrei as chaves de API do projeto (publishable/secret).");
  if (secret.api_key.includes("·") || secret.api_key.endsWith("…"))
    fail("A chave secreta veio mascarada; tente de novo.");
  return { publishable: publishable.api_key, secret: secret.api_key };
}

function redirectList(appUrl) {
  return [LOCAL_URL, appUrl]
    .filter(Boolean)
    .map((url) => `${url.replace(/\/$/, "")}/**`)
    .join(",");
}

async function configureAuth(ref, appUrl) {
  await api("PATCH", `/v1/projects/${ref}/config/auth`, {
    disable_signup: true,
    site_url: appUrl || LOCAL_URL,
    uri_allow_list: redirectList(appUrl),
  });
}

async function conectar() {
  const ref = opts.ref?.trim();
  if (!ref || !/^[a-z0-9]{20}$/.test(ref))
    fail(
      "Informe o identificador do projeto com --ref (20 letras e números, está no endereço do painel).",
    );

  await waitUntilReady(ref);
  console.log("✔ Projeto pronto");

  const tables = await publicTables(ref);
  const alreadyInstalled = tables.includes("companies") && tables.includes("candidates");
  if (tables.length && !alreadyInstalled && !opts.forcar) {
    fail(
      `Este projeto já tem ${tables.length} tabela(s) que não são deste sistema (${tables.slice(0, 5).join(", ")}…).\n` +
        "  Use um projeto novo ou rode de novo com --forcar se tiver certeza.",
    );
  }

  const linkArgs = ["link", "--project-ref", ref];
  if (opts["senha-banco"]) linkArgs.push("--password", opts["senha-banco"]);
  cli(linkArgs);
  const pushArgs = ["db", "push", "--yes"];
  if (opts["senha-banco"]) pushArgs.push("--password", opts["senha-banco"]);
  cli(pushArgs);
  console.log("✔ Tabelas do sistema criadas/atualizadas");

  const keys = pickKeys(await api("GET", `/v1/projects/${ref}/api-keys?reveal=true`));
  const url = `https://${ref}.supabase.co`;
  writeEnv({
    SUPABASE_URL: url,
    SUPABASE_PUBLISHABLE_KEY: keys.publishable,
    SUPABASE_SERVICE_ROLE_KEY: keys.secret,
    SUPABASE_PROJECT_ID: ref,
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_PUBLISHABLE_KEY: keys.publishable,
    VITE_SUPABASE_PROJECT_ID: ref,
    ...(opts["senha-banco"] ? { SUPABASE_DB_PASSWORD: opts["senha-banco"] } : {}),
  });
  console.log("✔ Arquivo .env preenchido com as chaves do projeto");

  await configureAuth(ref, envValue(readEnvFile(), "APP_URL"));
  console.log("✔ Login configurado (cadastro aberto desligado; acessos só pelo administrador)");
  console.log('\nPróximo passo: npm run empresa -- --nome "Nome da empresa"\n');
}

async function endereco() {
  const appUrl = opts.url?.trim().replace(/\/$/, "");
  if (!appUrl || !/^https?:\/\//.test(appUrl))
    fail("Informe o endereço publicado com --url https://...");
  const ref = envValue(readEnvFile(), "SUPABASE_PROJECT_ID");
  if (!ref) fail("SUPABASE_PROJECT_ID não está no .env. Rode antes: npm run supabase:conectar");
  writeEnv({ APP_URL: appUrl });
  await configureAuth(ref, appUrl);
  console.log(`\n✔ Endereço ${appUrl} gravado no .env e liberado no login do Supabase.\n`);
}

const commands = { conectar, endereco };
const run = commands[command];
if (!run)
  fail(`Comando desconhecido: ${command ?? "(nenhum)"}. Use: ${Object.keys(commands).join(", ")}`);
await run().catch((error) => fail(error.message));
