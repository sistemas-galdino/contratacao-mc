import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Link2, NotebookPen, Pencil, Plus, Sparkles, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { InterviewAnalysis } from "@/lib/ai.functions";
import { InterviewAnalysisPanel } from "@/components/interview-analysis-panel";
import {
  BrandButton,
  Chip,
  EmptyState,
  Field,
  GhostButton,
  Panel,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui-bits";

export type InterviewRow = Database["public"]["Tables"]["interviews"]["Row"];
type HistoryItem = { analysis: InterviewAnalysis; analyzed_at: string | null };

export function hasInterviewContent(i: InterviewRow) {
  const spoken = `${i.transcript ?? ""}${i.source_file_text ?? ""}`.trim().length;
  const notes = `${i.notes ?? ""}${i.observations ?? ""}${i.positives ?? ""}${i.attention_points ?? ""}`.trim().length;
  return spoken >= 50 || notes >= 50;
}

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { extractText: pdf } = await import("unpdf");
    const { text } = await pdf(new Uint8Array(await file.arrayBuffer()), { mergePages: true });
    return String(text);
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return res.value;
  }
  if (/\.(txt|md|srt|vtt|csv|rtf)$/.test(name) || file.type.startsWith("text/")) return file.text();
  throw new Error("Formato não suportado");
}

export function InterviewTab({
  interviews,
  companyId,
  candidateId,
  stages,
  currentStageId,
  analyzingId,
  onAnalyze,
  onChanged,
}: {
  interviews: InterviewRow[];
  companyId: string;
  candidateId: string;
  stages: { id: string; name: string }[];
  currentStageId: string | null;
  analyzingId: string | null;
  onAnalyze: (interview: InterviewRow) => void;
  onChanged: (created?: InterviewRow) => void;
}) {
  const [editing, setEditing] = useState<InterviewRow | "new" | null>(interviews.length ? null : "new");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = interviews.find((i) => i.id === selectedId) ?? interviews[interviews.length - 1];

  return (
    <>
      <Panel className="lg:col-span-2">
        <SectionTitle title="Entrevista" hint="tudo fica salvo neste candidato e nesta vaga" />
        {interviews.length > 1 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {interviews.map((i, idx) => (
              <button
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                className={`rounded-full px-3 py-1 text-[12px] ring-1 ring-line ${current?.id === i.id ? "bg-brand text-brand-ink" : "bg-paper/50"}`}
              >
                Entrevista {idx + 1} · {fmt(i.interviewed_at ?? i.created_at)}
              </button>
            ))}
          </div>
        ) : null}
        {!current ? (
          <EmptyState
            title="Adicionar entrevista"
            hint="Adicione o conteúdo da entrevista para gerar uma análise baseada nas respostas reais do candidato."
          />
        ) : (
          <InterviewSources
            interview={current}
            analyzing={analyzingId === current.id}
            onAnalyze={() => onAnalyze(current)}
            onEdit={() => setEditing(current)}
          />
        )}
        <div className="mt-3">
          <GhostButton onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Adicionar conteúdo de nova entrevista
          </GhostButton>
        </div>
      </Panel>

      {editing ? (
        <InterviewForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          companyId={companyId}
          candidateId={candidateId}
          stages={stages}
          currentStageId={currentStageId}
          onCancel={interviews.length ? () => setEditing(null) : undefined}
          onDone={(row, created) => {
            setEditing(null);
            setSelectedId(row.id);
            onChanged(created ? row : undefined);
          }}
        />
      ) : null}

      {current?.ai_analysis ? (
        <>
          <InterviewAnalysisPanel analysis={current.ai_analysis as unknown as InterviewAnalysis} />
          <AnalysisHistory interview={current} />
        </>
      ) : null}

      {current ? <MyObservations key={current.id} interview={current} onSaved={() => onChanged()} /> : null}
    </>
  );
}

function InterviewSources({
  interview: i,
  analyzing,
  onAnalyze,
  onEdit,
}: {
  interview: InterviewRow;
  analyzing: boolean;
  onAnalyze: () => void;
  onEdit: () => void;
}) {
  const sources: [string, boolean, React.ReactNode][] = [
    ["Transcrição", !!i.transcript?.trim(), <FileText key="t" className="size-3.5" />],
    ["Arquivo", !!i.source_file_text?.trim(), <Upload key="f" className="size-3.5" />],
    ["Link da gravação", !!i.recording_link?.trim(), <Link2 key="l" className="size-3.5" />],
    ["Observações", !!(i.notes || i.observations || i.positives || i.attention_points), <NotebookPen key="o" className="size-3.5" />],
  ];
  const ready = hasInterviewContent(i);
  const onlyLink = !!i.recording_link && !i.transcript && !i.source_file_text;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium">
          {i.interviewer ?? "Entrevista"} · <span className="font-mono text-[11px] text-ink-soft">{fmt(i.interviewed_at ?? i.created_at)}</span>
        </p>
        {i.analyzed_at ? <span className="font-mono text-[11px] text-ink-soft">analisada em {fmt(i.analyzed_at)}</span> : null}
      </div>
      <div>
        <p className="mb-1 text-[12px] text-ink-soft">Fontes</p>
        <div className="flex flex-wrap gap-2">
          {sources.map(([label, ok, icon]) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] ${ok ? "bg-brand/15 text-brand" : "bg-paper/50 text-ink-soft"}`}
            >
              {icon} {ok ? "✓" : "—"} {label}
            </span>
          ))}
        </div>
      </div>
      {i.source_file_name ? <p className="text-[12px] text-ink-soft">Arquivo: {i.source_file_name}</p> : null}
      {i.recording_link ? (
        <p className="text-[12px]">
          <span className="text-ink-soft">Link: </span>
          <a href={i.recording_link} target="_blank" rel="noreferrer" className="text-brand underline break-all">
            {i.recording_link}
          </a>
        </p>
      ) : null}
      {onlyLink ? (
        <p className="rounded-[10px] bg-amber/15 p-2 text-[12px] text-amber">
          Não conseguimos ler o conteúdo do link automaticamente. O link ficou salvo — adicione a transcrição ou um arquivo compatível para gerar a análise.
        </p>
      ) : null}
      {i.recommendation ? (
        <Chip tone={i.recommendation === "avancar" ? "teal" : "rose"}>
          {i.recommendation === "avancar" ? "Recomenda avançar" : "Não recomenda avançar"}
        </Chip>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <BrandButton onClick={onAnalyze} disabled={!ready || analyzing}>
          <Sparkles className="size-4" />
          {analyzing ? "Analisando entrevista..." : i.ai_analysis ? "Gerar análise novamente" : "Analisar entrevista com IA"}
        </BrandButton>
        <GhostButton onClick={onEdit}>
          <Pencil className="size-4" /> Editar transcrição, arquivo, link ou observações
        </GhostButton>
      </div>
      {!ready ? <p className="text-[11px] text-ink-soft">Adicione a transcrição, um arquivo ou anotações para habilitar a análise.</p> : null}
    </div>
  );
}

function InterviewForm({
  initial,
  companyId,
  candidateId,
  stages,
  currentStageId,
  onCancel,
  onDone,
}: {
  initial: InterviewRow | null;
  companyId: string;
  candidateId: string;
  stages: { id: string; name: string }[];
  currentStageId: string | null;
  onCancel?: (() => void) | undefined;
  onDone: (row: InterviewRow, created: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [form, setForm] = useState({
    interviewer: initial?.interviewer ?? "",
    stage_id: initial?.stage_id ?? currentStageId ?? "",
    transcript: initial?.transcript ?? "",
    source_file_name: initial?.source_file_name ?? "",
    source_file_text: initial?.source_file_text ?? "",
    recording_link: initial?.recording_link ?? "",
    notes: initial?.notes ?? "",
    observations: initial?.observations ?? "",
    recommendation: initial?.recommendation ?? "avancar",
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error("Arquivo acima de 15 MB."); return; }
    setExtracting(true);
    try {
      const text = (await extractText(file)).trim();
      if (!text) throw new Error("vazio");
      setForm((f) => ({ ...f, source_file_name: file.name, source_file_text: text }));
      toast.success("Conteúdo do arquivo extraído");
    } catch {
      toast.error("Não conseguimos ler este arquivo. Envie PDF, DOCX ou TXT, ou cole a transcrição.");
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        interviewer: form.interviewer || null,
        stage_id: form.stage_id || null,
        transcript: form.transcript.trim() || null,
        source_file_name: form.source_file_name || null,
        source_file_text: form.source_file_text || null,
        recording_link: form.recording_link.trim() || null,
        notes: form.notes || null,
        observations: form.observations || null,
        recommendation: form.recommendation,
      };
      if (initial) {
        const { data, error } = await supabase.from("interviews").update(payload).eq("id", initial.id).select("*").single();
        if (error) throw error;
        return { row: data, created: false };
      }
      const { data, error } = await supabase
        .from("interviews")
        .insert({ ...payload, company_id: companyId, candidate_id: candidateId, interviewed_at: new Date().toISOString() })
        .select("*")
        .single();
      if (error) throw error;
      await supabase.from("candidate_events").insert({
        company_id: companyId,
        candidate_id: candidateId,
        type: "entrevista",
        title: "Entrevista registrada",
        detail: form.interviewer || null,
      });
      return { row: data, created: true };
    },
    onSuccess: ({ row, created }) => {
      toast.success(created ? "Entrevista registrada" : "Entrevista atualizada — gere a análise novamente para incluir as mudanças");
      onDone(row, created);
    },
    onError: () => toast.error("Não foi possível salvar a entrevista."),
  });

  return (
    <Panel className="lg:col-span-2">
      <SectionTitle
        title={initial ? "Editar conteúdo da entrevista" : "Adicionar entrevista"}
        hint="adicione o conteúdo para uma análise baseada nas respostas reais"
      />
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Quem entrevistou">
            <TextInput value={form.interviewer} onChange={(e) => setForm({ ...form, interviewer: e.target.value })} />
          </Field>
          <Field label="Etapa">
            <SelectInput value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
              <option value="">Selecione</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <Field label="Opção 1 — Colar transcrição" description="Fonte principal para o que o candidato efetivamente disse.">
          <TextArea
            rows={8}
            placeholder="Cole aqui a transcrição da entrevista"
            value={form.transcript}
            onChange={(e) => setForm({ ...form, transcript: e.target.value })}
          />
        </Field>

        <div>
          <p className="mb-1 text-[12px] text-ink-soft">Opção 2 — Enviar arquivo</p>
          <p className="mb-1.5 text-[11px] text-ink-soft/70">PDF, DOCX ou TXT. O texto é extraído automaticamente.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.srt,.vtt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton type="button" onClick={() => fileRef.current?.click()} disabled={extracting}>
              <Upload className="size-4" /> {extracting ? "Lendo arquivo..." : "Enviar arquivo"}
            </GhostButton>
            {form.source_file_name ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-[12px] text-brand">
                {form.source_file_name} · {form.source_file_text.length.toLocaleString("pt-BR")} caracteres
                <button type="button" aria-label="Remover arquivo" onClick={() => setForm({ ...form, source_file_name: "", source_file_text: "" })}>
                  <X className="size-3.5" />
                </button>
              </span>
            ) : null}
          </div>
        </div>

        <Field
          label="Opção 3 — Link da gravação ou arquivo"
          description="Google Drive ou outro link. Se não for possível ler o conteúdo, o link fica salvo e pedimos a transcrição."
        >
          <TextInput
            type="url"
            placeholder="https://"
            value={form.recording_link}
            onChange={(e) => setForm({ ...form, recording_link: e.target.value })}
          />
        </Field>

        <div className="rounded-[12px] bg-paper/40 p-3 ring-1 ring-line">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand">Opção 4 — Anotação do recrutador</p>
          <div className="grid gap-3">
            <Field label="Como foi a entrevista?" description="Registre suas percepções, informações importantes ou acontecimentos da entrevista.">
              <TextArea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <Field label="Observações adicionais">
              <TextArea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
            </Field>
            <p className="text-[11px] text-ink-soft">Essas anotações nunca são apresentadas como fala do candidato.</p>
          </div>
        </div>

        <Field label="Recomendação">
          <SelectInput value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}>
            <option value="avancar">Recomendo avançar</option>
            <option value="nao_avancar">Não recomendo avançar</option>
          </SelectInput>
        </Field>

        <div className="flex flex-wrap gap-2">
          <BrandButton onClick={() => save.mutate()} disabled={save.isPending || extracting}>
            {save.isPending ? "Salvando..." : initial ? "Salvar alterações" : "Salvar entrevista"}
          </BrandButton>
          {onCancel ? <GhostButton onClick={onCancel}>Cancelar</GhostButton> : null}
        </div>
      </div>
    </Panel>
  );
}

function AnalysisHistory({ interview }: { interview: InterviewRow }) {
  const history = (Array.isArray(interview.analysis_history) ? interview.analysis_history : []) as unknown as HistoryItem[];
  const [open, setOpen] = useState<number | null>(null);
  if (!history.length) return null;
  return (
    <Panel className="lg:col-span-2">
      <SectionTitle title="Análises anteriores" hint="preservadas a cada nova análise" />
      <div className="flex flex-wrap gap-2">
        {history.map((h, idx) => (
          <GhostButton key={idx} onClick={() => setOpen(open === idx ? null : idx)}>
            Versão {idx + 1} · {fmt(h.analyzed_at) || "sem data"}
          </GhostButton>
        ))}
      </div>
      {open !== null && history[open] ? (
        <div className="mt-4">
          <InterviewAnalysisPanel analysis={history[open].analysis} />
        </div>
      ) : null}
    </Panel>
  );
}

function MyObservations({ interview, onSaved }: { interview: InterviewRow; onSaved: () => void }) {
  const [text, setText] = useState(interview.recruiter_observations ?? "");
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("interviews").update({ recruiter_observations: text || null }).eq("id", interview.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observação salva");
      onSaved();
    },
  });
  return (
    <Panel className="lg:col-span-2">
      <SectionTitle title="Minhas observações" hint="observação do recrutador — separada das falas do candidato" />
      <TextArea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva suas observações sobre esta entrevista" />
      <div className="mt-2">
        <GhostButton onClick={() => save.mutate()} disabled={save.isPending}>Salvar observação</GhostButton>
      </div>
    </Panel>
  );
}
