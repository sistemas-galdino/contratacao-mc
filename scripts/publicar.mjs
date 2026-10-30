// Publica o sistema no Cloudflare Workers: gera o build (com as chaves públicas do .env)
// e envia as variáveis do servidor como segredos do Worker.
//
//   npx wrangler login     (uma vez, abre o navegador)
//   npm run publicar
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);

// Só o que o servidor lê em process.env. A chave secreta do Supabase (service role) não vai para o Worker.
const secrets = Object.fromEntries(
  ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "OPENAI_API_KEY", "OPENAI_MODEL"]
    .filter((name) => env(name))
    .map((name) => [name, env(name)]),
);

const dir = mkdtempSync(join(tmpdir(), "contratacao-"));
const secretsFile = join(dir, "secrets.json");
writeFileSync(secretsFile, JSON.stringify(secrets), { mode: 0o600 });
try {
  run("npx", [
    "wrangler",
    "deploy",
    "--name",
    env("CLOUDFLARE_WORKER_NAME") || "contratacao",
    "--secrets-file",
    secretsFile,
  ]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("\n✔ Publicado. O endereço do sistema aparece acima (termina em .workers.dev).");
console.log(
  "  Guarde-o em APP_URL no .env e libere-o no Supabase (Authentication → URL Configuration).\n",
);
