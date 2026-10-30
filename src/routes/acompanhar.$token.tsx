import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandButton, Chip } from "@/components/ui-bits";

export const Route = createFileRoute("/acompanhar/$token")({
  head: () => ({ meta: [
    { title: "Acompanhar candidatura — Vetor" },
    { name: "description", content: "Acompanhe sua candidatura e acesse a próxima etapa quando estiver disponível." },
    { property: "og:title", content: "Acompanhar candidatura — Vetor" },
    { property: "og:description", content: "Acompanhe sua candidatura e suas próximas etapas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }), component: Journey,
});

type JourneyData = { name: string; job_title: string; stage: string; stage_name: string | null; case_token: string | null; case_status: string | null; interview: { description: string | null; format: string | null; duration_minutes: number | null; agenda_link: string | null; meet_link: string | null } | null };
const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

function Journey() {
  const { token } = useParams({ from: "/acompanhar/$token" });
  const { data, isLoading } = useQuery({ queryKey: ["journey", token], queryFn: async () => {
    const result = await rpc("get_candidate_journey", { _token: token });
    if (result.error) throw result.error;
    return result.data as JourneyData | null;
  }, refetchInterval: 60000 });
  if (isLoading) return <main className="mx-auto max-w-2xl px-5 py-20 text-ink-soft">Carregando candidatura…</main>;
  if (!data) return <main className="mx-auto max-w-2xl px-5 py-20"><h1 className="text-2xl">Link não disponível</h1><p className="mt-3 text-ink-soft">Confira o link pessoal que recebeu ao se candidatar.</p></main>;
  const isInterview = data.stage === "entrevista" || data.stage === "entrevista_gestor";
  return <main className="mx-auto max-w-2xl px-5 py-14 sm:py-24">
    <p className="eyebrow text-brand">Sua candidatura · {data.job_title}</p>
    <h1 className="mt-4 text-3xl sm:text-4xl">Olá, {data.name.split(" ")[0]}.</h1>
    <p className="mt-4 text-ink-soft">Aqui você acompanha somente a etapa disponível para você neste momento.</p>
    <div className="mt-10 border-t border-line pt-8">
      <div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-brand" /><span>Candidatura enviada</span></div>
      <div className="ml-2.5 h-9 border-l border-line" />
      <div className="flex items-center gap-3"><span className={`size-5 rounded-full border-2 ${data.stage === "analise" ? "border-brand" : "border-brand bg-brand"}`} /><span>{data.stage === "analise" ? "Em análise" : data.stage === "concluido" ? "Processo concluído" : "Análise concluída"}</span></div>
      {(isInterview || data.stage === "case") && <><div className="ml-2.5 h-9 border-l border-line" /><div className="flex items-center gap-3"><span className="size-5 rounded-full bg-brand" /><span>Próxima etapa disponível</span></div></>}
    </div>
    <section className="mt-10 border-t border-line pt-8">
      {data.stage === "analise" ? <><Chip tone="amber">Em análise</Chip><h2 className="mt-4">Estamos analisando seu perfil</h2><p className="mt-3 text-ink-soft">Quando houver uma próxima etapa para você, as orientações estarão disponíveis aqui.</p></> : null}
      {data.stage === "concluido" ? <><Chip>Processo concluído</Chip><h2 className="mt-4">Obrigado por participar</h2><p className="mt-3 text-ink-soft">Agradecemos seu tempo e interesse na oportunidade.</p></> : null}
      {isInterview ? <><Chip tone="brand">Próxima etapa disponível</Chip><h2 className="mt-4">Você avançou para a próxima etapa!</h2><h3 className="mt-6">{data.stage_name || "Entrevista"}</h3><p className="mt-3 whitespace-pre-line text-ink-soft">{data.interview?.description || "Esta é uma conversa para conhecermos melhor sua trajetória e como você trabalha. Nossa equipe entrará em contato com as orientações de agendamento."}</p>{(data.interview?.format || data.interview?.duration_minutes) && <p className="mt-4 text-ink-soft">{[data.interview.format, data.interview.duration_minutes ? `${data.interview.duration_minutes} minutos` : null].filter(Boolean).join(" · ")}</p>}{data.interview?.agenda_link && <a className="mt-6 inline-flex items-center gap-2 rounded bg-brand px-5 py-3 font-semibold text-brand-ink" href={data.interview.agenda_link} target="_blank" rel="noreferrer"><CalendarClock className="size-4" /> Agendar minha entrevista</a>}{data.interview?.meet_link && <a className="mt-4 block text-brand underline" href={data.interview.meet_link} target="_blank" rel="noreferrer">Entrar na reunião</a>}</> : null}
      {data.stage === "case" ? <><Chip tone="brand">Case disponível</Chip><h2 className="mt-4">Você avançou para o Case Técnico</h2><p className="mt-3 text-ink-soft">Parabéns por avançar para mais uma etapa do nosso processo. Preparamos um desafio para conhecer melhor sua forma de analisar e executar situações relacionadas à função.</p>{data.case_token ? <Link to="/case/$token" params={{ token: data.case_token }} className="mt-7 inline-flex items-center gap-2 rounded bg-brand px-5 py-3 font-semibold text-brand-ink">Acessar meu case <ArrowRight className="size-4" /></Link> : <p className="mt-5 text-ink-soft">O desafio estará disponível aqui após a aprovação pela equipe.</p>}{data.case_status === "entregue" && <p className="mt-4 text-brand">Case enviado</p>}{data.case_status === "pronto_para_apresentar" && <p className="mt-4 text-brand">Preparação confirmada</p>}</> : null}
    </section>
    <div className="mt-10"><BrandButton onClick={() => window.location.reload()}>Atualizar acompanhamento</BrandButton></div>
  </main>;
}
