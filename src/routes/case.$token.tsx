import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Clock, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BrandButton,
  Chip,
  Field,
  GhostButton,
  Panel,
  SectionTitle,
  TextArea,
  TextInput,
} from "@/components/ui-bits";

export const Route = createFileRoute("/case/$token")({
  head: () => ({
    meta: [
      { title: "Case técnico — Vetor" },
      {
        name: "description",
        content: "Veja o desafio, sua missão, o que precisa entregar, o prazo e como será a apresentação do case.",
      },
      { property: "og:title", content: "Case técnico — Vetor" },
      { property: "og:description", content: "Briefing completo do case técnico do processo seletivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicCase,
});

type Section = { title: string; content: string };

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function PublicCase() {
  const { token } = useParams({ from: "/case/$token" });
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<"entregue" | "pronto" | null>(null);
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-case", token],
    queryFn: async () => {
      const { data: result, error } = await rpc("get_public_case", { _token: token });
      if (error) throw error;
      return result as
        | {
            shared?: boolean;
            case: Record<string, unknown>;
            job: { title: string; city: string | null; state: string | null; work_mode: string | null };
            company: { name: string; segment: string | null };
          }
        | null;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-[13px] text-ink-soft">Carregando case…</p>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Panel>
          <SectionTitle title="Case não disponível" />
          <p className="text-[13px] text-ink-soft">
            Este link não está mais válido ou o case ainda não foi publicado. Fale com a pessoa responsável pelo processo.
          </p>
        </Panel>
      </div>
    );
  }

  const caseRow = data.case;
  const sections = (Array.isArray(caseRow["sections"]) ? caseRow["sections"] : []) as Section[];
  const criar = caseRow["modality"] !== "material_pronto";
  const needsPresentation = caseRow["needs_presentation"] !== false;
  const prazo = (caseRow["prep_deadline"] as string) || `${caseRow["deadline_days"] ?? "—"} dias`;
  const agendaLink = caseRow["agenda_link"] as string | null;
  const meetLink = caseRow["meet_link"] as string | null;
  const materials = (Array.isArray(caseRow["materials"]) ? caseRow["materials"] : []) as {
    label?: string;
    url?: string;
  }[];

  const shared = data.shared !== false;
  const text = (key: string) => (typeof caseRow[key] === "string" ? (caseRow[key] as string).trim() : "");
  const list = (key: string) => (Array.isArray(caseRow[key]) ? (caseRow[key] as string[]).filter(Boolean) : []);
  const sectionTitles = sections.map((s) => s.title.toLowerCase());
  const has = (word: string) => sectionTitles.some((t) => t.includes(word));
  const extras: Section[] = [
    !has("objetivo") && text("objective") ? { title: "Objetivo do case", content: text("objective") } : null,
    !sections.length && text("content") ? { title: "Briefing do case", content: text("content") } : null,
    list("deliverables").length || text("delivery_description") || text("delivery_format")
      ? {
          title: "O que você precisa entregar",
          content: [
            ...list("deliverables").map((d) => `• ${d}`),
            text("delivery_format") ? `Formato: ${text("delivery_format")}` : "",
            text("delivery_description"),
          ].filter(Boolean).join("\n"),
        }
      : null,
    list("tools").length
      ? { title: "Ferramentas", content: `${list("tools").join(", ")}${caseRow["tool_required"] ? " (uso obrigatório)" : " (sugestão)"}` }
      : null,
    !has("avalia") && (text("evaluate_what") || text("criteria"))
      ? { title: "O que vamos observar", content: [text("evaluate_what"), text("criteria")].filter(Boolean).join("\n") }
      : null,
  ].filter(Boolean) as Section[];

  async function submit(kind: "entrega" | "preparo") {
    if (shared && !email.trim()) {
      toast.error("Informe o e-mail usado na candidatura.");
      return;
    }
    if (kind === "entrega" && !url.trim()) {
      toast.error("Cole o link do seu material ou descreva a entrega.");
      return;
    }
    setSending(true);
    try {
      const { error } =
        kind === "entrega"
          ? await rpc("submit_case_delivery", {
              _token: token,
              _email: email,
              _kind: "link",
              _url: url,
              _notes: notes,
            })
          : await rpc("confirm_case_ready", { _token: token, _email: email });
      if (error) throw error;
      setDone(kind === "entrega" ? "entregue" : "pronto");
      toast.success(kind === "entrega" ? "Case recebido!" : "Preparo confirmado!");
    } catch (error) {
      console.error(error);
      toast.error(shared ? "Não encontramos sua candidatura com este e-mail. Confira e tente novamente." : "Não conseguimos registrar agora. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-5 py-10">
      <header>
        <Chip tone="brand">Case técnico</Chip>
        <h1 className="mt-3 text-[26px] font-bold leading-tight text-ink">
          {(caseRow["title"] as string) || `Case — ${data.job.title}`}
        </h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          {data.job.title} · {data.company.name}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
          <Chip tone="teal">
            <Clock className="mr-1 inline size-3" /> Prazo: {prazo}
          </Chip>
          {needsPresentation ? (
            <Chip>
              {caseRow["presentation_format"] as string} · {String(caseRow["presentation_minutes"] ?? 30)} min
              {caseRow["questions_minutes"] ? ` + ${String(caseRow["questions_minutes"])} min de perguntas` : ""}
            </Chip>
          ) : null}
        </div>
      </header>

      {[...sections, ...extras].map((section) => (
        <Panel key={section.title}>
          <SectionTitle title={section.title} />
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{section.content}</p>
        </Panel>
      ))}

      {materials.length ? (
        <Panel>
          <SectionTitle title="Material do case" />
          <ul className="grid gap-2 text-[14px]">
            {materials.map((material, index) => (
              <li key={index}>
                <a className="text-brand underline" href={material.url} target="_blank" rel="noreferrer">
                  {material.label || material.url}
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {(agendaLink || meetLink) ? (
        <Panel>
          <SectionTitle title={agendaLink ? "Agende sua apresentação" : "Acessar reunião"} />
          <div className="flex flex-wrap gap-2">
            {agendaLink ? (
              <BrandButton type="button" onClick={() => window.open(agendaLink, "_blank")}>
                <CalendarClock className="size-3.5" /> Agendar apresentação
              </BrandButton>
            ) : null}
            {meetLink ? (
              <GhostButton type="button" onClick={() => window.open(meetLink, "_blank")}>
                <Video className="size-3.5" /> Entrar no Google Meet
              </GhostButton>
            ) : null}
          </div>
        </Panel>
      ) : null}

      <Panel>
        {done ? (
          <div className="flex items-center gap-2 text-[15px] text-ink">
            <CheckCircle2 className="size-4 text-brand" />
            {done === "entregue" ? "Case recebido ✓" : "Preparo confirmado ✓"} Boa sorte na apresentação!
          </div>
        ) : criar ? (
          <>
            <SectionTitle title="Enviar meu case" hint="link do material" />
            <div className="grid gap-3">
              {shared ? (
                <Field label="E-mail da candidatura">
                  <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </Field>
              ) : null}
              <Field label="Link do material" description="Apresentação, documento, planilha, vídeo ou arquivo compartilhado.">
                <TextInput value={url} placeholder="https://" onChange={(event) => setUrl(event.target.value)} />
              </Field>
              <Field label="Observações (opcional)">
                <TextArea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </Field>
              <BrandButton type="button" disabled={sending} onClick={() => void submit("entrega")}>
                {sending ? "Enviando…" : "Enviar meu case"}
              </BrandButton>
            </div>
          </>
        ) : (
          <>
            <SectionTitle title="Confirmar preparação" hint="sem envio de arquivo" />
            <div className="grid gap-3">
              {shared ? (
                <Field label="E-mail da candidatura">
                  <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </Field>
              ) : null}
              <GhostButton type="button" disabled={sending} onClick={() => void submit("preparo")}>
                <CheckCircle2 className="size-3.5" />
                {sending ? "Registrando…" : "Confirmar que estou pronto para apresentar"}
              </GhostButton>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
