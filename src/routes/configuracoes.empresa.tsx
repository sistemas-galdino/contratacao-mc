import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, useSession } from "@/hooks/use-session";
import { PageHeading, RequireAuth } from "@/components/app-shell";
import {
  BrandButton,
  Chip,
  EmptyState,
  Field,
  Panel,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui-bits";
import { SECTORS, formatDate } from "@/lib/hiring";

export const Route = createFileRoute("/configuracoes/empresa")({
  head: () => ({
    meta: [
      { title: "Configurações da empresa — Vetor" },
      {
        name: "description",
        content:
          "Cadastre os dados e a cultura da sua empresa: missão, visão, valores e documentos que servem de contexto para as contratações.",
      },
      { property: "og:title", content: "Configurações da empresa — Vetor" },
      {
        property: "og:description",
        content: "Dados, cultura e documentos da empresa usados como contexto nas contratações.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CompanySettings />
    </RequireAuth>
  ),
});

const DOC_KINDS = [
  { value: "manual", label: "Manual da empresa" },
  { value: "pop", label: "POP / processos" },
  { value: "cargos", label: "Descrição de cargos" },
  { value: "organograma", label: "Organograma" },
  { value: "outro", label: "Outro" },
];

type CompanyForm = {
  name: string;
  segment: string;
  headcount: string;
  website: string;
  city: string;
  state: string;
  logo_url: string;
  description: string;
  mission: string;
  vision: string;
  values_text: string;
  working_here: string;
  valued_behaviors: string;
  misaligned_behaviors: string;
  expectations: string;
  notes: string;
};

const EMPTY_FORM: CompanyForm = {
  name: "",
  segment: "",
  headcount: "",
  website: "",
  city: "",
  state: "",
  logo_url: "",
  description: "",
  mission: "",
  vision: "",
  values_text: "",
  working_here: "",
  valued_behaviors: "",
  misaligned_behaviors: "",
  expectations: "",
  notes: "",
};

function CompanySettings() {
  const { session } = useSession();
  const { data: company } = useCompany(Boolean(session));
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [docKind, setDocKind] = useState("manual");
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name ?? "",
      segment: company.segment ?? "",
      headcount: company.headcount ?? "",
      website: company.website ?? "",
      city: company.city ?? "",
      state: company.state ?? "",
      logo_url: company.logo_url ?? "",
      description: company.description ?? "",
      mission: company.mission ?? "",
      vision: company.vision ?? "",
      values_text: company.values_text ?? "",
      working_here: company.working_here ?? "",
      valued_behaviors: company.valued_behaviors ?? "",
      misaligned_behaviors: company.misaligned_behaviors ?? "",
      expectations: company.expectations ?? "",
      notes: company.notes ?? "",
    });
  }, [company]);

  const set = (key: keyof CompanyForm) => (event: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const { data: documents } = useQuery({
    queryKey: ["company-documents", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("companies")
        .update({
          name: form.name,
          segment: form.segment || null,
          headcount: form.headcount || null,
          website: form.website || null,
          city: form.city || null,
          state: form.state || null,
          logo_url: form.logo_url || null,
          description: form.description || null,
          mission: form.mission || null,
          vision: form.vision || null,
          values_text: form.values_text || null,
          working_here: form.working_here || null,
          valued_behaviors: form.valued_behaviors || null,
          misaligned_behaviors: form.misaligned_behaviors || null,
          expectations: form.expectations || null,
          notes: form.notes || null,
        })
        .eq("id", companyId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados da empresa atualizados");
      queryClient.invalidateQueries({ queryKey: ["company"] });
    },
    onError: () => toast.error("Não foi possível salvar agora"),
  });

  const addDocument = useMutation({
    mutationFn: async (payload: { name: string; kind: string; content: string; filePath?: string }) => {
      const { error } = await supabase.from("company_documents").insert({
        company_id: companyId!,
        name: payload.name,
        kind: payload.kind,
        content_text: payload.content || null,
        file_path: payload.filePath ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento guardado como contexto");
      setDocTitle("");
      setDocContent("");
      queryClient.invalidateQueries({ queryKey: ["company-documents", companyId] });
    },
    onError: () => toast.error("Não foi possível guardar o documento"),
  });

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = file.type.startsWith("text") || file.name.endsWith(".txt") ? await file.text() : "";
    addDocument.mutate({
      name: docTitle || file.name,
      kind: docKind,
      content: text,
      filePath: file.name,
    });
    event.target.value = "";
  }

  return (
    <>
      <PageHeading
        eyebrow="Configurações"
        title="Sua empresa e sua cultura"
        aside={
          <BrandButton onClick={() => save.mutate()} disabled={save.isPending}>
            Salvar alterações
          </BrandButton>
        }
      />

      <div className="grid gap-4 pb-10 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle title="Dados da empresa" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da empresa" className="sm:col-span-2">
              <TextInput value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Segmento">
              <SelectInput value={form.segment} onChange={set("segment")}>
                <option value="">Selecione</option>
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Nº de colaboradores">
              <TextInput value={form.headcount} onChange={set("headcount")} placeholder="Ex.: 12" />
            </Field>
            <Field label="Site">
              <TextInput value={form.website} onChange={set("website")} placeholder="https://" />
            </Field>
            <Field label="Logo (URL)">
              <TextInput value={form.logo_url} onChange={set("logo_url")} placeholder="https://" />
            </Field>
            <Field label="Cidade">
              <TextInput value={form.city} onChange={set("city")} />
            </Field>
            <Field label="Estado">
              <TextInput value={form.state} onChange={set("state")} maxLength={2} />
            </Field>
            <Field label="Descrição da empresa" className="sm:col-span-2">
              <TextArea value={form.description} onChange={set("description")} />
            </Field>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Cultura" hint="contexto das contratações" />
          <div className="grid gap-3">
            <Field label="Missão">
              <TextArea rows={2} value={form.mission} onChange={set("mission")} />
            </Field>
            <Field label="Visão">
              <TextArea rows={2} value={form.vision} onChange={set("vision")} />
            </Field>
            <Field label="Valores">
              <TextArea rows={2} value={form.values_text} onChange={set("values_text")} />
            </Field>
            <Field label="Como é trabalhar aqui">
              <TextArea rows={2} value={form.working_here} onChange={set("working_here")} />
            </Field>
            <Field label="Comportamentos valorizados">
              <TextArea rows={2} value={form.valued_behaviors} onChange={set("valued_behaviors")} />
            </Field>
            <Field label="Comportamentos que não combinam">
              <TextArea rows={2} value={form.misaligned_behaviors} onChange={set("misaligned_behaviors")} />
            </Field>
            <Field label="Expectativas com quem entra">
              <TextArea rows={2} value={form.expectations} onChange={set("expectations")} />
            </Field>
            <Field label="Observações">
              <TextArea rows={2} value={form.notes} onChange={set("notes")} />
            </Field>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <SectionTitle title="Documentos da empresa" hint="manual, POP, cargos, organograma" />
          <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <Field label="Tipo">
              <SelectInput value={docKind} onChange={(event) => setDocKind(event.target.value)}>
                {DOC_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Título">
              <TextInput
                value={docTitle}
                onChange={(event) => setDocTitle(event.target.value)}
                placeholder="Ex.: Manual de integração"
              />
            </Field>
            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[13px] font-medium ring-1 ring-white/10">
              <Upload className="size-3.5" />
              Enviar arquivo
              <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <Field label="Ou escreva o conteúdo manualmente" className="mt-3">
            <TextArea
              rows={4}
              value={docContent}
              onChange={(event) => setDocContent(event.target.value)}
              placeholder="Cole aqui o texto do manual, dos processos ou das descrições de cargo."
            />
          </Field>
          <BrandButton
            className="mt-3"
            disabled={!docTitle || !docContent || addDocument.isPending}
            onClick={() => addDocument.mutate({ name: docTitle, kind: docKind, content: docContent })}
          >
            Guardar contexto
          </BrandButton>

          <div className="mt-5 space-y-2">
            {(documents ?? []).length === 0 ? (
              <EmptyState
                title="Nenhum documento guardado"
                hint="Tudo que você enviar aqui fica salvo como contexto da empresa."
              />
            ) : (
              (documents ?? []).map((document) => (
                <div
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-paper/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="size-4 text-ink-soft" />
                    <div>
                      <p className="text-[13px] font-medium">{document.name}</p>
                      <p className="text-[11px] text-ink-soft">
                        {document.file_path ?? "texto manual"} · {formatDate(document.created_at)}
                      </p>
                    </div>
                  </div>
                  <Chip>{DOC_KINDS.find((kind) => kind.value === document.kind)?.label ?? document.kind}</Chip>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
