import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAccessDenied, useCompany, useSession } from "@/hooks/use-session";

function Blobs() {
  return (
    <div className="pointer-events-none fixed inset-0" aria-hidden="true">
      <div className="absolute -top-48 -left-24 size-[520px] rounded-full bg-brand/8 blur-3xl" />
      <div className="absolute top-1/3 -right-32 size-[460px] rounded-full bg-panel/70 blur-3xl" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { data: company } = useCompany(Boolean(session));
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Blobs />
      <div className="relative z-10 mx-auto max-w-[1400px] px-5 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-[10px] bg-brand font-display text-base font-semibold tracking-tight text-brand-ink">
                V
              </div>
              <div className="leading-tight">
                <p className="font-display text-[15px] font-semibold tracking-tight">Vetor</p>
                <p className="text-[11px] text-ink-soft">Recrutamento inteligente</p>
              </div>
            </Link>
            <nav className="ml-3 hidden items-center gap-1 sm:flex">
              <Link
                to="/"
                className="rounded-full px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink"
                activeProps={{ className: "text-ink surface-solid" }}
                activeOptions={{ exact: true }}
              >
                Painel
              </Link>
              <Link
                to="/vagas"
                className="rounded-full px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink"
                activeProps={{ className: "text-ink surface-solid" }}
              >
                Vagas
              </Link>
              <Link
                to="/configuracoes/empresa"
                className="rounded-full px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink"
                activeProps={{ className: "text-ink surface-solid" }}
              >
                Configurações
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {company ? (
              <div className="hidden items-center gap-2 rounded-full surface px-3 py-1.5 sm:flex">
                <span className="size-1.5 rounded-full bg-teal" />
                <span className="text-[12px] text-ink-soft">{company.name}</span>
                {company.headcount ? (
                  <>
                    <span className="text-[12px] text-ink/30">·</span>
                    <span className="text-[12px] text-ink-soft">{company.headcount} colaboradores</span>
                  </>
                ) : null}
              </div>
            ) : null}
            <Link
              to="/vagas/nova"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand py-2 pl-3 pr-3 text-[13px] font-medium text-brand-ink transition-transform hover:-translate-y-px"
            >
              <span className="hidden sm:inline">Nova vaga</span>
              <Plus className="size-4" />
            </Link>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/entrar" });
              }}
              className="rounded-full px-2 py-1.5 text-[12px] text-ink-soft transition-colors hover:text-ink"
            >
              Sair
            </button>
          </div>
        </header>
        {children}
        <div className="h-16" />
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { isLoading: companyLoading, error: companyError } = useCompany(Boolean(session));

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/entrar" });
  }, [loading, session, navigate]);

  if (session && companyError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5">
        <div className="w-full max-w-[420px] rounded-[20px] surface p-7 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Acesso não liberado</h1>
          <p className="mt-2 text-[13px] text-ink-soft">
            {isAccessDenied(companyError)
              ? "Sua conta ainda não faz parte da equipe deste sistema. Peça ao administrador para cadastrar você."
              : "Não conseguimos carregar os dados da sua empresa. Tente novamente em instantes."}
          </p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/entrar" });
            }}
            className="mt-6 w-full rounded-full bg-brand py-2.5 text-[13px] font-medium text-brand-ink"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (loading || !session || companyLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="eyebrow">Carregando…</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

export function PageHeading({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-3">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 max-w-[30ch] text-3xl font-semibold leading-none tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
      </div>
      {aside}
    </section>
  );
}
