import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, useSession } from "@/hooks/use-session";
import { RequireAuth, PageHeading } from "@/components/app-shell";
import { Chip, EmptyState, SectionTitle } from "@/components/ui-bits";
import { salaryLabel } from "@/lib/hiring";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de contratações — Vetor" },
      {
        name: "description",
        content:
          "Veja em segundos o andamento das suas contratações: vagas abertas, candidatos por etapa e quem precisa da sua atenção agora.",
      },
      { property: "og:title", content: "Painel de contratações — Vetor" },
      {
        property: "og:description",
        content: "Vagas abertas, candidatos por etapa e as próximas ações do seu processo seletivo.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

type CandidateRow = {
  id: string;
  name: string;
  status: string;
  job_id: string;
  stage_id: string | null;
  job_stages: { stage_key: string | null; name: string; position: number } | null;
};

function Dashboard() {
  const { session } = useSession();
  const { data: company } = useCompany(Boolean(session));
  const companyId = company?.id;

  const { data } = useQuery({
    queryKey: ["dashboard", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [jobs, candidates] = await Promise.all([
        supabase
          .from("jobs")
          .select("*")
          .eq("company_id", companyId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("candidates")
          .select("id,name,status,job_id,stage_id,job_stages(stage_key,name,position)")
          .eq("company_id", companyId!),
      ]);
      if (jobs.error) throw jobs.error;
      if (candidates.error) throw candidates.error;
      return { jobs: jobs.data, candidates: (candidates.data ?? []) as CandidateRow[] };
    },
  });

  const jobs = data?.jobs ?? [];
  const candidates = data?.candidates ?? [];

  const openJobs = jobs.filter((job) => job.status === "aberta");
  const countStage = (key: string, jobId?: string) =>
    candidates.filter(
      (candidate) =>
        candidate.status === "ativo" &&
        candidate.job_stages?.stage_key === key &&
        (!jobId || candidate.job_id === jobId),
    ).length;

  const hired = candidates.filter((candidate) => candidate.status === "contratado").length;
  const attention =
    countStage("assessment") + countStage("case") + countStage("etapa_final") + countStage("contratacao");

  const metrics = [
    { label: "Vagas abertas", value: openJobs.length, hint: "em andamento" },
    { label: "Candidatos", value: candidates.length, hint: "todas as vagas" },
    { label: "Em triagem", value: countStage("triagem"), hint: "precisa de ação", tone: "text-brand" },
    { label: "Em entrevista", value: countStage("entrevista") + countStage("entrevista_gestor"), hint: "agendadas", tone: "text-amber" },
    { label: "Em case", value: countStage("case"), hint: "prática", tone: "text-rose" },
    { label: "Etapa final", value: countStage("etapa_final") + countStage("contratacao"), hint: "decisão", tone: "text-teal" },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Visão geral"
        title="Seu quadro de contratações"
        aside={
          <div className="flex items-center gap-2 rounded-full surface px-3 py-1.5 text-[12px] text-ink-soft">
            <span className="size-1.5 rounded-full bg-brand" />
            {attention} {attention === 1 ? "pessoa precisa" : "pessoas precisam"} da sua atenção
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 pb-7 md:grid-cols-4 lg:grid-cols-7">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[14px] surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">{metric.label}</p>
            <p className={`mt-2 font-display text-3xl font-semibold leading-none ${metric.tone ?? ""}`}>
              {metric.value}
            </p>
            <p className="mt-2 font-mono text-[11px] text-ink-soft">{metric.hint}</p>
          </div>
        ))}
        <div className="rounded-[14px] bg-brand p-4 text-brand-ink">
          <p className="text-[11px] uppercase tracking-wide text-brand-ink/60">Contratados</p>
          <p className="mt-2 font-display text-3xl font-semibold leading-none">{hired}</p>
          <p className="mt-2 font-mono text-[11px] text-brand-ink/50">no total</p>
        </div>
      </section>

      <section className="pb-10">
        <SectionTitle
          title="Processos em andamento"
          hint={`${openJobs.length} ${openJobs.length === 1 ? "vaga ativa" : "vagas ativas"}`}
        />

        {openJobs.length === 0 ? (
          <EmptyState
            title="Nenhuma vaga aberta ainda"
            hint="Crie sua primeira vaga para montar o processo de contratação."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {openJobs.map((job) => {
              const jobCandidates = candidates.filter((candidate) => candidate.job_id === job.id);
              const advanced = jobCandidates.filter(
                (candidate) =>
                  candidate.status === "ativo" &&
                  !["inscricao", "triagem"].includes(candidate.job_stages?.stage_key ?? ""),
              ).length;
              const progress = jobCandidates.length
                ? Math.min(100, Math.round((advanced / jobCandidates.length) * 100))
                : 0;

              return (
                <div
                  key={job.id}
                  className="rounded-[16px] surface p-5 transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-ink-soft">{job.sector}</p>
                      <h3 className="mt-1 max-w-[18ch] font-display text-lg font-semibold tracking-tight text-balance">
                        {job.title}
                      </h3>
                    </div>
                    <Chip tone="brand">Vaga aberta</Chip>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[job.contract_model, job.work_mode, salaryLabel(job)].filter(Boolean).map((tag) => (
                      <span key={String(tag)} className="rounded-full bg-paper/70 px-2 py-0.5 text-[11px] text-ink-soft">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-soft">
                    <span>
                      <b className="font-display text-sm text-ink">{jobCandidates.length}</b> candidatos
                    </span>
                    <span>
                      <b className="font-display text-sm text-ink">{countStage("triagem", job.id)}</b> triagem
                    </span>
                    <span>
                      <b className="font-display text-sm text-ink">
                        {countStage("entrevista", job.id) + countStage("entrevista_gestor", job.id)}
                      </b>{" "}
                      entrevistas
                    </span>
                    <span>
                      <b className="font-display text-sm text-ink">{countStage("case", job.id)}</b> case
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[11px] text-ink-soft">
                      <span>Progresso</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <Link
                    to="/vagas/$jobId"
                    params={{ jobId: job.id }}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand py-2 text-[13px] font-medium text-brand-ink transition-transform hover:-translate-y-px"
                  >
                    Abrir processo <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
