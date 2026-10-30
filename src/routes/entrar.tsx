import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

// Contas são criadas pelo administrador (npm run usuario:adicionar); não há cadastro aberto.
// O login com Google é opcional: exige o provedor Google ativo no Supabase (veja docs/INSTALACAO.md).
const GOOGLE_LOGIN = import.meta.env["VITE_GOOGLE_LOGIN"] === "true";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Vetor, contratação inteligente" },
      {
        name: "description",
        content:
          "Acesse o Vetor para acompanhar suas vagas, o funil de candidatos e as próximas etapas do processo de contratação.",
      },
      { property: "og:title", content: "Entrar — Vetor, contratação inteligente" },
      {
        property: "og:description",
        content: "Acesse suas vagas, o funil de candidatos e as próximas etapas da contratação.",
      },
    ],
  }),
  component: EntrarPage,
});

function EntrarPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : error.message,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Não foi possível entrar com o Google");
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-5">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 -left-24 size-[520px] rounded-full bg-panel/60 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[460px] rounded-full bg-brand/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] rounded-[20px] surface p-7">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-[10px] bg-brand font-display text-base font-semibold text-brand-ink">
            V
          </div>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold tracking-tight">Vetor</p>
            <p className="text-[11px] text-ink-soft">Recrutamento inteligente</p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-semibold leading-none tracking-tight">
          Entrar na sua conta
        </h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          Acompanhe suas vagas, o funil de candidatos e o que precisa da sua atenção.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <Field label="E-mail">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-[10px] bg-paper/70 px-3 py-2 text-[14px] outline-none ring-1 ring-white/10 focus:ring-brand/40"
              placeholder="voce@empresa.com"
            />
          </Field>
          <Field label="Senha">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[10px] bg-paper/70 px-3 py-2 text-[14px] outline-none ring-1 ring-white/10 focus:ring-brand/40"
              placeholder="••••••••"
            />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand py-2.5 text-[13px] font-medium text-brand-ink transition-transform hover:-translate-y-px disabled:opacity-60"
          >
            Entrar
          </button>
        </form>

        {GOOGLE_LOGIN ? (
          <button
            type="button"
            onClick={handleGoogle}
            className="mt-3 w-full rounded-full bg-paper py-2.5 text-[13px] font-medium ring-1 ring-white/10 transition-transform hover:-translate-y-px"
          >
            Continuar com o Google
          </button>
        ) : null}

        <p className="mt-5 text-center text-[12px] text-ink-soft">
          Ainda não tem acesso? Peça ao administrador do sistema para cadastrar você.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
