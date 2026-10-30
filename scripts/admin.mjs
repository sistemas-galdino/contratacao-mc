// Tarefas de administração da instalação: conferir a configuração, cadastrar a empresa
// e liberar o acesso da equipe. Usa a chave secreta do Supabase (SUPABASE_SERVICE_ROLE_KEY)
// e roda só na máquina de quem administra — nunca vai para o servidor publicado.
//
//   npm run verificar
//   npm run empresa -- --nome "Minha Empresa"
//   npm run usuario:adicionar -- --email ana@empresa.com --nome "Ana Souza" [--dono] [--senha "..."]
//   npm run usuario:listar
//   npm run usuario:senha -- --email ana@empresa.com [--senha "..."]
//   npm run usuario:remover -- --email ana@empresa.com
import { randomInt } from "node:crypto";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const DEMO_COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_AI_MODEL = "gpt-6-astra";

if (existsSync(".env")) process.loadEnvFile(".env");

const [command, ...rest] = process.argv.slice(2);
const { values: opts } = parseArgs({
  args: rest,
  allowPositionals: true,
  options: {
    nome: { type: "string" },
    email: { type: "string" },
    senha: { type: "string" },
    id: { type: "string" },
    dono: { type: "boolean", default: false },
    forcar: { type: "boolean", default: false },
  },
});

const env = (name) => process.env[name]?.trim() || "";

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

// Chaves novas do Supabase (sb_publishable_/sb_secret_) não são JWT: vão só no header apikey.
function supabaseFetch(key) {
  return (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    const isNewKey = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
    if (isNewKey && headers.get("Authorization") === `Bearer ${key}`)
      headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function client(key) {
  return createClient(env("SUPABASE_URL") || env("VITE_SUPABASE_URL"), key, {
    global: { fetch: supabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function adminClient() {
  if (!env("SUPABASE_URL") && !env("VITE_SUPABASE_URL"))
    fail("Falta SUPABASE_URL no arquivo .env.");
  if (!env("SUPABASE_SERVICE_ROLE_KEY"))
    fail("Falta SUPABASE_SERVICE_ROLE_KEY (chave secreta do Supabase) no arquivo .env.");
  return client(env("SUPABASE_SERVICE_ROLE_KEY"));
}

function generatePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return [group(), group(), group(), group()].join("-");
}

function appUrl() {
  return env("APP_URL") || "http://localhost:8080";
}

async function getCompany(db) {
  const { data, error } = await db
    .from("companies")
    .select("id, name")
    .eq("is_demo", false)
    .order("created_at");
  if (error)
    fail(
      `Não consegui ler as empresas: ${error.message}. As migrações já foram aplicadas? (npm run db:aplicar)`,
    );
  if (opts.id) {
    const found = data.find((company) => company.id === opts.id);
    if (!found) fail(`Empresa ${opts.id} não encontrada.`);
    return found;
  }
  if (data.length === 0)
    fail('Nenhuma empresa cadastrada. Rode antes: npm run empresa -- --nome "Nome da empresa"');
  if (data.length > 1) {
    const list = data.map((company) => `  ${company.id}  ${company.name}`).join("\n");
    fail(`Há mais de uma empresa. Informe qual com --id:\n${list}`);
  }
  return data[0];
}

async function findUser(db, email) {
  const target = email.trim().toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Não consegui listar as contas: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === target);
    if (user) return user;
    if (data.users.length < 200) return null;
  }
}

function requireEmail() {
  const email = opts.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) fail("Informe o e-mail com --email pessoa@empresa.com");
  return email;
}

async function empresa() {
  const name = opts.nome?.trim();
  if (!name) fail('Informe o nome com --nome "Nome da empresa"');
  const db = adminClient();
  const { data, error } = await db
    .from("companies")
    .select("id, name")
    .eq("is_demo", false)
    .order("created_at");
  if (error)
    fail(
      `Não consegui ler as empresas: ${error.message}. As migrações já foram aplicadas? (npm run db:aplicar)`,
    );

  const target = opts.id
    ? data.find((company) => company.id === opts.id)
    : data.length === 1
      ? data[0]
      : null;
  if (opts.id && !target) fail(`Empresa ${opts.id} não encontrada.`);
  if (!target && data.length > 1) {
    const list = data.map((company) => `  ${company.id}  ${company.name}`).join("\n");
    fail(`Há mais de uma empresa. Informe qual renomear com --id:\n${list}`);
  }

  if (target) {
    const { error: updateError } = await db.from("companies").update({ name }).eq("id", target.id);
    if (updateError) fail(updateError.message);
    console.log(`\n✔ Empresa atualizada: ${name} (${target.id})\n`);
    return;
  }
  const { data: created, error: insertError } = await db
    .from("companies")
    .insert({ name })
    .select("id")
    .single();
  if (insertError) fail(insertError.message);
  console.log(`\n✔ Empresa cadastrada: ${name} (${created.id})\n`);
}

async function usuarioAdicionar() {
  const email = requireEmail();
  const db = adminClient();
  const company = await getCompany(db);
  const fullName = opts.nome?.trim() || null;

  let user = await findUser(db, email);
  let password = opts.senha || null;
  if (password && password.length < 6) fail("A senha precisa ter pelo menos 6 caracteres.");

  if (!user) {
    password ??= generatePassword();
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : {},
    });
    if (error) fail(`Não consegui criar a conta: ${error.message}`);
    user = data.user;
  } else {
    const changes = { email_confirm: true, ...(password ? { password } : {}) };
    const { error } = await db.auth.admin.updateUserById(user.id, changes);
    if (error) fail(`Não consegui atualizar a conta: ${error.message}`);
  }

  const { error: profileError } = await db
    .from("profiles")
    .upsert({ id: user.id, email, ...(fullName ? { full_name: fullName } : {}) });
  if (profileError) fail(`Não consegui salvar o perfil: ${profileError.message}`);

  const { error: memberError } = await db
    .from("company_members")
    .upsert(
      { company_id: company.id, user_id: user.id, role: opts.dono ? "owner" : "member" },
      { onConflict: "company_id,user_id" },
    );
  if (memberError) fail(`Não consegui liberar o acesso: ${memberError.message}`);

  console.log(`\n✔ Acesso liberado na empresa ${company.name}`);
  console.log(`  Endereço: ${appUrl()}`);
  console.log(`  E-mail:   ${email}`);
  console.log(`  Senha:    ${password ?? "(a mesma que a pessoa já usava)"}`);
  console.log(`  Perfil:   ${opts.dono ? "dono" : "equipe"}\n`);
}

async function usuarioListar() {
  const db = adminClient();
  const company = await getCompany(db);
  const { data: members, error } = await db
    .from("company_members")
    .select("user_id, role, created_at")
    .eq("company_id", company.id)
    .order("created_at");
  if (error) fail(error.message);
  if (members.length === 0) {
    console.log(`\nNinguém cadastrado ainda em ${company.name}.\n`);
    return;
  }
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, email")
    .in(
      "id",
      members.map((member) => member.user_id),
    );
  console.log(`\nEquipe de ${company.name}:\n`);
  for (const member of members) {
    const profile = profiles?.find((item) => item.id === member.user_id);
    const { data } = await db.auth.admin.getUserById(member.user_id);
    const lastLogin = data.user?.last_sign_in_at
      ? new Date(data.user.last_sign_in_at).toLocaleString("pt-BR")
      : "nunca entrou";
    const role = member.role === "owner" ? "dono" : "equipe";
    console.log(
      `  ${profile?.email ?? data.user?.email ?? member.user_id}  ${profile?.full_name ?? ""}  [${role}]  último acesso: ${lastLogin}`,
    );
  }
  console.log("");
}

async function usuarioSenha() {
  const email = requireEmail();
  const db = adminClient();
  const user = await findUser(db, email);
  if (!user) fail(`Não existe conta com o e-mail ${email}.`);
  const password = opts.senha || generatePassword();
  if (password.length < 6) fail("A senha precisa ter pelo menos 6 caracteres.");
  const { error } = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) fail(error.message);
  console.log(`\n✔ Nova senha de ${email}: ${password}\n`);
}

async function usuarioRemover() {
  const email = requireEmail();
  const db = adminClient();
  const user = await findUser(db, email);
  if (!user) fail(`Não existe conta com o e-mail ${email}.`);

  const { data: memberships } = await db
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id);
  for (const membership of memberships ?? []) {
    if (membership.role !== "owner") continue;
    const { count } = await db
      .from("company_members")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", membership.company_id)
      .eq("role", "owner");
    if ((count ?? 0) <= 1 && !opts.forcar) {
      fail(
        "Essa pessoa é o único dono da empresa. Cadastre outro dono antes (--dono) ou use --forcar.",
      );
    }
  }

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) fail(error.message);
  console.log(
    `\n✔ Acesso de ${email} removido (a conta foi apagada; o histórico das vagas continua).\n`,
  );
}

async function verificar() {
  let errors = 0;
  const ok = (message) => console.log(`  ✔ ${message}`);
  const warn = (message) => console.log(`  ⚠ ${message}`);
  const bad = (message) => {
    errors++;
    console.log(`  ✖ ${message}`);
  };

  console.log("\nConferindo a instalação…\n");
  if (!existsSync(".env")) bad("Arquivo .env não encontrado (copie o .env.example e preencha).");

  const required = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missing = required.filter((name) => !env(name));
  if (missing.length) bad(`Faltam no .env: ${missing.join(", ")}`);
  else ok("Variáveis do Supabase preenchidas");

  if (
    env("VITE_SUPABASE_URL") &&
    env("SUPABASE_URL") &&
    env("VITE_SUPABASE_URL") !== env("SUPABASE_URL")
  ) {
    bad("VITE_SUPABASE_URL e SUPABASE_URL estão diferentes — as duas devem ser o mesmo endereço.");
  }
  if (
    env("VITE_SUPABASE_PUBLISHABLE_KEY") &&
    env("SUPABASE_PUBLISHABLE_KEY") &&
    env("VITE_SUPABASE_PUBLISHABLE_KEY") !== env("SUPABASE_PUBLISHABLE_KEY")
  ) {
    bad(
      "VITE_SUPABASE_PUBLISHABLE_KEY e SUPABASE_PUBLISHABLE_KEY estão diferentes — as duas devem ser a mesma chave.",
    );
  }
  if (
    env("SUPABASE_SERVICE_ROLE_KEY") &&
    env("SUPABASE_SERVICE_ROLE_KEY") === env("SUPABASE_PUBLISHABLE_KEY")
  ) {
    bad(
      "SUPABASE_SERVICE_ROLE_KEY está igual à chave pública — use a chave secreta (service_role / sb_secret_).",
    );
  }

  if (env("SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY")) {
    const db = client(env("SUPABASE_SERVICE_ROLE_KEY"));
    const { error: tableError } = await db
      .from("companies")
      .select("id", { count: "exact", head: true });
    if (tableError) {
      bad(`Banco sem as tabelas do sistema (${tableError.message}). Rode: npm run db:aplicar`);
    } else {
      ok("Banco conectado e tabelas criadas");

      const { error: bucketError } = await db.storage.getBucket("curriculos");
      if (bucketError)
        bad(
          "Bucket de currículos não existe — a última migração não foi aplicada. Rode: npm run db:aplicar",
        );
      else ok("Armazenamento de currículos pronto");

      const { data: companies } = await db
        .from("companies")
        .select("id, name")
        .eq("is_demo", false);
      if (!companies?.length)
        bad('Nenhuma empresa cadastrada. Rode: npm run empresa -- --nome "Nome da empresa"');
      else ok(`Empresa: ${companies.map((company) => company.name).join(", ")}`);

      const { data: demo } = await db.from("companies").select("id").eq("id", DEMO_COMPANY_ID);
      if (demo?.length) warn("A empresa de exemplo (dados fictícios) ainda existe no banco.");

      const { count } = await db
        .from("company_members")
        .select("user_id", { count: "exact", head: true });
      if (!count)
        bad(
          'Ninguém tem acesso ainda. Rode: npm run usuario:adicionar -- --email voce@empresa.com --nome "Seu nome" --dono',
        );
      else ok(`${count} pessoa(s) com acesso`);
    }
  }

  if (env("SUPABASE_URL") && env("SUPABASE_PUBLISHABLE_KEY")) {
    const pub = client(env("SUPABASE_PUBLISHABLE_KEY"));
    const { error: publicError } = await pub.rpc("get_public_job", {
      _job_id: "00000000-0000-0000-0000-000000000000",
    });
    if (publicError)
      bad(
        `A chave pública não funciona (${publicError.message}). Confira SUPABASE_PUBLISHABLE_KEY.`,
      );
    else ok("Chave pública funcionando (formulário dos candidatos)");
  }

  const openaiKey = env("OPENAI_API_KEY");
  const model = env("OPENAI_MODEL") || DEFAULT_AI_MODEL;
  if (!openaiKey) {
    warn(
      "Sem OPENAI_API_KEY: o sistema funciona, mas sem os recursos de IA (usa sugestões automáticas).",
    );
  } else {
    try {
      const response = await fetch(
        `https://api.openai.com/v1/models/${encodeURIComponent(model)}`,
        {
          headers: { Authorization: `Bearer ${openaiKey}` },
        },
      );
      if (response.ok) ok(`OpenAI conectada (modelo ${model})`);
      else if (response.status === 401) bad("A chave da OpenAI (OPENAI_API_KEY) é inválida.");
      else if (response.status === 404)
        bad(
          `O modelo "${model}" não está disponível nesta conta da OpenAI. Defina outro em OPENAI_MODEL.`,
        );
      else warn(`OpenAI respondeu ${response.status}; confira a chave e o saldo da conta.`);
    } catch {
      warn("Não consegui falar com a OpenAI agora (sem internet?).");
    }
  }

  console.log(errors ? `\n✖ ${errors} problema(s) para resolver.\n` : "\n✔ Tudo pronto.\n");
  process.exit(errors ? 1 : 0);
}

const commands = {
  verificar,
  empresa,
  "usuario:adicionar": usuarioAdicionar,
  "usuario:listar": usuarioListar,
  "usuario:senha": usuarioSenha,
  "usuario:remover": usuarioRemover,
};

const run = commands[command];
if (!run)
  fail(
    `Comando desconhecido: ${command ?? "(nenhum)"}. Use um destes: ${Object.keys(commands).join(", ")}`,
  );
await run();
