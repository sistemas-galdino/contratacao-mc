import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, useSession } from "@/hooks/use-session";
import { PageHeading, RequireAuth } from "@/components/app-shell";
import { Chip, EmptyState } from "@/components/ui-bits";
import { formatDate, salaryLabel } from "@/lib/hiring";

export const Route = createFileRoute("/vagas/")({
  head: () => ({
    meta: [
      { title: "Minhas vagas — Vetor" },
      {
        name: "description",
        content: "Todas as suas vagas em um só lugar: abertas, encerradas e o número de candidatos de cada processo.",
      },
      { property: "og:title", content: "Minhas vagas — Vetor" },
      {
        property: "og:description",
        content: "Vagas abertas e encerradas, com candidatos e etapas de cada processo seletivo.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <JobsPage />
    </RequireAuth>
  ),
});

function JobsPage() {
  const { session } = useSession();
  const { data: company } = useCompany(Boolean(session));
  const companyId = company?.id;
  const [filter, setFilter] = useState<"todas" | "aberta" | "encerrada">("todas");

  const { data } = useQuery({
    queryKey: ["jobs", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [jobs, candidates] = await Promise.all([
        supabase.from("jobs").select("*").eq("company_id", companyId!).order("created_at", { ascending: false }),
        supabase.from("candidates").select("id,job_id,status").eq("company_id", companyId!),
      ]);
      if (jobs.error) throw jobs.error;
      if (candidates.error) throw candidates.error;
      return { jobs: jobs.data, candidates: candidates.data ?? [] };
    },
  });

  const jobs = (data?.jobs ?? []).filter((job) => filter === "todas" || job.status === filter);

  return (
    <>
      <PageHeading
        eyebrow="Vagas"
        title="Minhas vagas"
        aside={
          <div className="flex gap-1 rounded-full surface p-1">
            {(["todas", "aberta", "encerrada"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-full px-3 py-1.5 text-[12px] capitalize transition-colors ${
                  filter === option ? "bg-brand text-brand-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {option === "aberta" ? "abertas" : option === "encerrada" ? "encerradas" : "todas"}
              </button>
            ))}
          </div>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga por aqui" hint="Crie uma vaga para montar o processo em poucos minutos." />
      ) : (
        <div className="space-y-3 pb-10">
          {jobs.map((job) => {
            const total = (data?.candidates ?? []).filter((candidate) => candidate.job_id === job.id).length;
            return (
              <Link
                key={job.id}
                to="/vagas/$jobId"
                params={{ jobId: job.id }}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] surface p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="min-w-[220px]">
                  <p className="text-[11px] uppercase tracking-wide text-ink-soft">
                    {job.sector} · aberta em {formatDate(job.created_at)}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">{job.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[job.work_mode, job.contract_model, job.city && `${job.city}/${job.state ?? ""}`, salaryLabel(job)]
                      .filter(Boolean)
                      .map((tag) => (
                        <span
                          key={String(tag)}
                          className="rounded-full bg-paper/70 px-2 py-0.5 text-[11px] text-ink-soft"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold leading-none">{total}</p>
                    <p className="font-mono text-[11px] text-ink-soft">candidatos</p>
                  </div>
                  <Chip tone={job.status === "aberta" ? "brand" : "neutral"}>
                    {job.status === "aberta" ? "Vaga aberta" : "Encerrada"}
                  </Chip>
                  <ArrowRight className="size-4 text-ink-soft" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
