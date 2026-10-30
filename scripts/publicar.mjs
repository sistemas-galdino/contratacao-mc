// Publica o sistema no Vercel: vincula o projeto (na primeira vez), envia as variáveis do .env
// e faz o deploy de produção. O build roda no Vercel.
//
//   npx vercel login     (uma vez, abre o navegador)
//   npm run publicar
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync(".env")) {
  console.error("\n✖ Arquivo .env não encontrado. Configure o sistema antes de publicar.\n");
  process.exit(1);
}
process.loadEnvFile(".env");

const env = (name) => process.env[name]?.trim() || "";
const missing = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
].filter((name) => !env(name));
if (missing.length) {
  console.error(`\n✖ Faltam no .env: ${missing.join(", ")}\n`);
  process.exit(1);
}
if (!env("OPENAI_API_KEY"))
  console.warn("\n⚠ Sem OPENAI_API_KEY: o sistema será publicado sem os recursos de IA.\n");

const project = env("VERCEL_PROJECT_NAME") || "contratacao";
const scope = env("VERCEL_SCOPE") ? ["--scope", env("VERCEL_SCOPE")] : [];

function vercel(args, { input, quiet = false } = {}) {
  const result = spawnSync("npx", ["vercel", ...args, ...scope], {
    input,
    stdio: [
      input !== undefined ? "pipe" : quiet ? "ignore" : "inherit",
      quiet ? "ignore" : "inherit",
      quiet ? "ignore" : "inherit",
    ],
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

if (!vercel(["whoami"], { quiet: true })) {
  console.error("\n✖ Você não está conectado ao Vercel. Rode: npx vercel login\n");
  process.exit(1);
}

// Primeira publicação: vincula ao projeto e, se ele ainda não existir no Vercel, cria antes.
const linked =
  existsSync(".vercel/project.json") ||
  vercel(["link", "--yes", "--project", project], { quiet: true }) ||
  (vercel(["project", "create", project]) && vercel(["link", "--yes", "--project", project]));
if (!linked) {
  console.error(
    `\n✖ Não consegui vincular ao projeto "${project}" no Vercel (veja a mensagem acima).\n`,
  );
  process.exit(1);
}

// Variáveis lidas pelo navegador (VITE_*, entram no build) e pelo servidor. A chave secreta do
// Supabase (service role) fica só neste computador.
const variables = [
  ["VITE_SUPABASE_URL", false],
  ["VITE_SUPABASE_PUBLISHABLE_KEY", false],
  ["VITE_SUPABASE_PROJECT_ID", false],
  ["VITE_GOOGLE_LOGIN", false],
  ["SUPABASE_URL", false],
  ["SUPABASE_PUBLISHABLE_KEY", false],
  ["OPENAI_API_KEY", true],
  ["OPENAI_MODEL", false],
];
console.log("Enviando as variáveis para o Vercel…");
for (const [name, secret] of variables) {
  if (!env(name)) {
    vercel(["env", "rm", name, "--environment", "production", "--yes"], { quiet: true });
    continue;
  }
  const ok = vercel(
    [
      "env",
      "add",
      name,
      "--environment",
      "production",
      "--force",
      secret ? "--sensitive" : "--no-sensitive",
    ],
    { input: env(name), quiet: true },
  );
  if (!ok) {
    console.error(
      `\n✖ Não consegui gravar ${name} no Vercel. Rode de novo; se persistir, confira o projeto no painel.\n`,
    );
    process.exit(1);
  }
}

if (!vercel(["deploy", "--prod", "--yes"])) process.exit(1);

console.log(
  '\n✔ Publicado. Use o endereço curto que aparece em "Aliased" (termina em .vercel.app):',
);
console.log(
  "  é ele que os candidatos acessam. Os endereços longos, com letras aleatórias, pedem login do Vercel.",
);
console.log(
  "  Depois rode: npm run supabase:endereco -- --url <endereço> --token <token do Supabase>\n",
);
