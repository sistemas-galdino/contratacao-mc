
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  segment text,
  headcount text,
  website text,
  city text,
  state text,
  description text,
  mission text,
  vision text,
  values_text text,
  working_here text,
  valued_behaviors text,
  misaligned_behaviors text,
  expectations text,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = _company_id AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
GRANT SELECT ON public.companies TO anon;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated USING (public.is_company_member(id));
CREATE POLICY "members update company" ON public.companies FOR UPDATE TO authenticated USING (public.is_company_member(id));
CREATE POLICY "anyone create company" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "public read company basics" ON public.companies FOR SELECT TO anon USING (true);
CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own memberships" ON public.company_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "create own membership" ON public.company_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  name text NOT NULL,
  kind text,
  file_path text,
  content_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_documents TO authenticated;
GRANT ALL ON public.company_documents TO service_role;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company docs" ON public.company_documents FOR ALL TO authenticated USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  title text NOT NULL,
  sector text,
  manager text,
  openings int NOT NULL DEFAULT 1,
  work_mode text,
  city text,
  state text,
  contract_model text,
  salary_type text DEFAULT 'fixo',
  salary_min numeric,
  salary_max numeric,
  benefits text,
  workload text,
  work_hours text,
  target_hire_date date,
  status text NOT NULL DEFAULT 'aberta',
  objective text,
  responsibilities text,
  routine text,
  expected_results text,
  challenges text,
  works_with text,
  reports_to text,
  prior_knowledge text,
  learn_after text,
  has_case boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
GRANT SELECT ON public.jobs TO anon;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company jobs" ON public.jobs FOR ALL TO authenticated USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "public read open jobs" ON public.jobs FOR SELECT TO anon USING (status = 'aberta');
CREATE TRIGGER jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.job_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  name text NOT NULL,
  kind text,
  file_path text,
  content_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.job_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  name text NOT NULL,
  importance text NOT NULL DEFAULT 'media',
  weight int,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.job_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  name text NOT NULL,
  level text NOT NULL DEFAULT 'basico',
  importance text NOT NULL DEFAULT 'desejavel',
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.job_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  description text NOT NULL,
  kind text NOT NULL DEFAULT 'obrigatorio',
  is_knockout boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.job_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.job_requirements ON DELETE SET NULL,
  question text NOT NULL,
  kind text NOT NULL DEFAULT 'eliminatoria',
  options jsonb NOT NULL DEFAULT '["Sim","Não"]'::jsonb,
  disqualifying_answer text,
  tag text,
  follow_up jsonb,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.job_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  name text NOT NULL,
  stage_key text,
  objective text,
  owner text,
  position int NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  has_evaluation boolean NOT NULL DEFAULT false,
  has_score boolean NOT NULL DEFAULT false,
  needs_manual_approval boolean NOT NULL DEFAULT true
);

CREATE TABLE public.job_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  stage_id uuid REFERENCES public.job_stages ON DELETE SET NULL,
  objective text,
  evaluate_what text,
  deadline_days int,
  delivery_format text,
  criteria text,
  content text,
  generated_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.interview_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  candidate_id uuid,
  title text NOT NULL DEFAULT 'Roteiro padrão da vaga',
  generated_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.interview_script_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES public.interview_scripts ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'competencia',
  question text NOT NULL,
  looking_for text,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Assessment da vaga',
  generated_by text NOT NULL DEFAULT 'manual',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  stage_id uuid REFERENCES public.job_stages ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  city text,
  state text,
  resume_url text,
  resume_text text,
  linkedin text,
  status text NOT NULL DEFAULT 'ativo',
  tags text[] NOT NULL DEFAULT '{}',
  employed_now boolean,
  current_company text,
  current_position text,
  current_tenure text,
  salary_expectation text,
  overall_score int,
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.candidate_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates ON DELETE CASCADE,
  question_id uuid REFERENCES public.job_questions ON DELETE SET NULL,
  question_text text,
  answer text,
  is_disqualifying boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  detail text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates ON DELETE CASCADE,
  stage_id uuid REFERENCES public.job_stages ON DELETE SET NULL,
  interviewer text,
  interviewed_at date,
  notes text,
  positives text,
  attention_points text,
  answers jsonb,
  observations text,
  recommendation text,
  transcript text,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates ON DELETE CASCADE,
  stage_id uuid REFERENCES public.job_stages ON DELETE SET NULL,
  competency text,
  score int,
  notes text,
  source text NOT NULL DEFAULT 'humano',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.case_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates ON DELETE CASCADE,
  job_case_id uuid REFERENCES public.job_cases ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'enviado',
  link text,
  file_path text,
  notes text,
  evaluation jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  score int,
  analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates ON DELETE CASCADE,
  role_title text,
  agreed_salary text,
  contract_model text,
  hired_at date NOT NULL DEFAULT current_date,
  start_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates ON DELETE CASCADE,
  reason text NOT NULL,
  requirement_id uuid REFERENCES public.job_requirements ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'job_documents','job_competencies','job_skills','job_requirements','job_questions',
    'job_stages','job_cases','interview_scripts','interview_script_questions','assessments',
    'candidates','candidate_answers','candidate_events','interviews','evaluations',
    'case_submissions','assessment_responses','hires','rejections'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "company scope" ON public.%I FOR ALL TO authenticated USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id))', t);
  END LOOP;
END $$;

CREATE TRIGGER candidates_updated BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.job_questions TO anon;
GRANT SELECT ON public.job_stages TO anon;
CREATE POLICY "public read questions of open jobs" ON public.job_questions FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.status = 'aberta'));
CREATE POLICY "public read stages of open jobs" ON public.job_stages FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.status = 'aberta'));

CREATE OR REPLACE FUNCTION public.apply_to_job(
  _job_id uuid,
  _name text,
  _email text,
  _phone text,
  _city text,
  _state text,
  _linkedin text,
  _employed_now boolean,
  _current_company text,
  _current_position text,
  _current_tenure text,
  _salary_expectation text,
  _answers jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_job public.jobs;
  v_stage uuid;
  v_candidate uuid;
  v_answer jsonb;
  v_question public.job_questions;
  v_disqualified boolean := false;
  v_reason text;
  v_tags text[] := '{}';
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id AND status = 'aberta';
  IF v_job.id IS NULL THEN RAISE EXCEPTION 'Vaga não disponível'; END IF;

  SELECT id INTO v_stage FROM public.job_stages WHERE job_id = _job_id ORDER BY position LIMIT 1;

  IF _employed_now IS TRUE THEN v_tags := array_append(v_tags, 'TRABALHANDO ATUALMENTE'); END IF;

  INSERT INTO public.candidates (company_id, job_id, stage_id, name, email, phone, city, state, linkedin,
    employed_now, current_company, current_position, current_tenure, salary_expectation, tags)
  VALUES (v_job.company_id, _job_id, v_stage, _name, _email, _phone, _city, _state, _linkedin,
    _employed_now, _current_company, _current_position, _current_tenure, _salary_expectation, v_tags)
  RETURNING id INTO v_candidate;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(coalesce(_answers, '[]'::jsonb))
  LOOP
    SELECT * INTO v_question FROM public.job_questions WHERE id = (v_answer->>'question_id')::uuid AND job_id = _job_id;
    IF v_question.id IS NOT NULL THEN
      INSERT INTO public.candidate_answers (company_id, candidate_id, question_id, question_text, answer, is_disqualifying)
      VALUES (v_job.company_id, v_candidate, v_question.id, v_question.question, v_answer->>'answer',
        v_question.kind = 'eliminatoria' AND v_question.disqualifying_answer IS NOT NULL
          AND lower(v_answer->>'answer') = lower(v_question.disqualifying_answer));

      IF v_question.kind = 'eliminatoria' AND v_question.disqualifying_answer IS NOT NULL
         AND lower(v_answer->>'answer') = lower(v_question.disqualifying_answer) THEN
        v_disqualified := true;
        v_reason := coalesce(v_reason || ' | ', '') || v_question.question || ' -> ' || (v_answer->>'answer');
      END IF;

      IF v_question.kind = 'classificatoria' AND v_question.tag IS NOT NULL
         AND lower(v_answer->>'answer') = 'sim' THEN
        UPDATE public.candidates SET tags = array_append(tags, v_question.tag) WHERE id = v_candidate;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.candidate_events (company_id, candidate_id, type, title, detail)
  VALUES (v_job.company_id, v_candidate, 'inscricao', 'Inscrição recebida', 'Candidatura pelo link público da vaga');

  IF v_disqualified THEN
    UPDATE public.candidates SET status = 'nao_atende_requisito' WHERE id = v_candidate;
    INSERT INTO public.rejections (company_id, candidate_id, reason, notes)
    VALUES (v_job.company_id, v_candidate, 'Não atendeu requisito objetivo', v_reason);
    INSERT INTO public.candidate_events (company_id, candidate_id, type, title, detail, metadata)
    VALUES (v_job.company_id, v_candidate, 'status', 'Status alterado para NÃO ATENDE REQUISITO OBJETIVO', v_reason,
      jsonb_build_object('regra', 'resposta eliminatória no formulário de inscrição'));
  END IF;

  RETURN v_candidate;
END $$;

GRANT EXECUTE ON FUNCTION public.apply_to_job(uuid,text,text,text,text,text,text,boolean,text,text,text,text,jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_current_user(_full_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_company uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sem sessão'; END IF;

  INSERT INTO public.profiles (id, full_name, email)
  SELECT v_user, _full_name, u.email FROM auth.users u WHERE u.id = v_user
  ON CONFLICT (id) DO UPDATE SET full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name);

  SELECT company_id INTO v_company FROM public.company_members WHERE user_id = v_user ORDER BY created_at LIMIT 1;
  IF v_company IS NOT NULL THEN RETURN v_company; END IF;

  SELECT id INTO v_company FROM public.companies WHERE is_demo ORDER BY created_at LIMIT 1;
  IF v_company IS NULL THEN
    INSERT INTO public.companies (name) VALUES ('Minha empresa') RETURNING id INTO v_company;
  END IF;

  INSERT INTO public.company_members (company_id, user_id, role) VALUES (v_company, v_user, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN v_company;
END $$;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text) TO authenticated;

INSERT INTO public.companies (id, name, segment, headcount, website, city, state, description,
  mission, vision, values_text, working_here, valued_behaviors, misaligned_behaviors, expectations, is_demo)
VALUES ('11111111-1111-1111-1111-111111111111', 'Empresa Exemplo', 'Serviços', '24', 'https://empresaexemplo.com.br',
  'São Paulo', 'SP', 'Empresa de serviços administrativos que apoia pequenos negócios na organização da operação.',
  'Simplificar a rotina administrativa dos nossos clientes.',
  'Ser referência em operação organizada e previsível.',
  'Clareza, responsabilidade, cuidado com detalhes e evolução contínua.',
  'Time pequeno, remoto, com autonomia e comunicação direta.',
  'Organização, iniciativa, transparência e cumprimento de prazos.',
  'Falta de comunicação, desorganização e descumprimento de combinados.',
  'Que entreguem com consistência e avisem cedo quando algo sair do plano.', true);

INSERT INTO public.jobs (id, company_id, title, sector, manager, openings, work_mode, city, state,
  contract_model, salary_type, salary_min, salary_max, benefits, workload, work_hours, status,
  objective, responsibilities, routine, expected_results, challenges, works_with, reports_to,
  prior_knowledge, learn_after, has_case)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
  'Assistente Administrativo', 'Administrativo', 'Marcos Ribeiro', 1, 'Remoto', 'São Paulo', 'SP',
  'PJ', 'faixa', 2500, 3000, 'Auxílio internet, day off no aniversário', '44h semanais', '08h às 18h', 'aberta',
  'Organizar a rotina administrativa e garantir que nada se perca no dia a dia.',
  'Controle de planilhas, organização de documentos, apoio ao financeiro e atendimento a clientes.',
  'Checagem de pendências no início do dia, atualização de controles e fechamento diário.',
  'Rotina administrativa em dia, sem atrasos em pagamentos e documentos organizados.',
  'Lidar com várias frentes ao mesmo tempo mantendo a organização.',
  'Financeiro, comercial e direção.', 'Gestor administrativo',
  'Excel e organização de rotinas.', 'Uso de IA no dia a dia e processos internos da empresa.', true);

INSERT INTO public.job_stages (company_id, job_id, name, stage_key, objective, owner, position, has_evaluation, has_score, needs_manual_approval)
VALUES
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Inscrição','inscricao','Receber candidaturas','Sistema',1,false,false,false),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Triagem','triagem','Verificar requisitos objetivos','Marcos Ribeiro',2,false,false,true),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Assessment','assessment','Avaliar competências principais','Sistema',3,true,true,true),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Entrevista','entrevista','Conhecer histórico e comportamento','Marcos Ribeiro',4,true,false,true),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Case','case','Ver a pessoa resolvendo na prática','Marcos Ribeiro',5,true,true,true),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Entrevista com gestor','entrevista_gestor','Validar aderência ao time','Direção',6,true,false,true),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Contratação','contratacao','Fechar proposta','Direção',7,false,false,true);

INSERT INTO public.job_competencies (company_id, job_id, name, importance, position) VALUES
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Organização','essencial',1),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Comunicação','alta',2),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Proatividade','alta',3),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Atenção aos detalhes','essencial',4);

INSERT INTO public.job_skills (company_id, job_id, name, level, importance, position) VALUES
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Google Workspace','intermediario','obrigatorio',1),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Excel','intermediario','obrigatorio',2),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Uso de IA','basico','desejavel',3);

INSERT INTO public.job_requirements (id, company_id, job_id, description, kind, is_knockout, position) VALUES
 ('33333333-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Notebook próprio','obrigatorio',true,1),
 ('33333333-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Celular próprio','obrigatorio',true,2),
 ('33333333-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Internet estável','obrigatorio',true,3),
 ('33333333-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Aceite do modelo de contratação PJ','obrigatorio',true,4);

INSERT INTO public.job_questions (company_id, job_id, requirement_id, question, kind, disqualifying_answer, tag, position) VALUES
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000004','A contratação desta vaga é PJ. Você possui disponibilidade e interesse em trabalhar neste modelo?','eliminatoria','Não',NULL,1),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000001','Você possui notebook próprio para trabalhar?','eliminatoria','Não',NULL,2),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000003','Você possui internet estável para trabalho remoto?','eliminatoria','Não',NULL,3),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',NULL,'Você está trabalhando atualmente?','classificatoria',NULL,'TRABALHANDO ATUALMENTE',4);

INSERT INTO public.job_cases (company_id, job_id, stage_id, objective, evaluate_what, deadline_days, delivery_format, criteria)
SELECT '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222', s.id,
  'Ver como a pessoa organiza uma rotina administrativa com pendências acumuladas.',
  'Organização, priorização, atenção aos detalhes e clareza na comunicação.',
  3, 'Planilha + resumo em texto',
  'Clareza da priorização, consistência dos dados, comunicação do que ficou pendente.'
FROM public.job_stages s WHERE s.job_id='22222222-2222-2222-2222-222222222222' AND s.stage_key='case';

INSERT INTO public.interview_scripts (id, company_id, job_id, title)
VALUES ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Roteiro padrão da vaga');

INSERT INTO public.interview_script_questions (company_id, script_id, category, question, looking_for, position) VALUES
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','experiencia','Conte como era sua rotina administrativa no último trabalho.','Nível de organização e volume de rotina',1),
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','situacional','Você recebeu três pendências urgentes ao mesmo tempo. Como decide o que fazer primeiro?','Critério de priorização',2),
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','competencia','Me dê um exemplo de erro que você evitou por atenção aos detalhes.','Atenção aos detalhes',3),
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','tecnica','Quais funções de Excel você usa no dia a dia?','Nível real em Excel',4),
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','padrao','Por que essa vaga faz sentido para você agora?','Motivação e aderência ao modelo PJ',5);

INSERT INTO public.candidates (company_id, job_id, stage_id, name, email, phone, city, state, status, tags, employed_now, current_company, current_position, current_tenure, overall_score)
SELECT '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
  (SELECT id FROM public.job_stages WHERE job_id='22222222-2222-2222-2222-222222222222' AND stage_key = d.stage_key),
  d.name, d.email, d.phone, d.city, d.state, d.status, d.tags, d.employed, d.cur_company, d.cur_position, d.tenure, d.score
FROM (VALUES
 ('Marina Souza','marina.souza@email.com','(11) 98888-1001','São Paulo','SP','inscricao','ativo',ARRAY['PJ OK'],false,NULL::text,NULL::text,NULL::text,NULL::int),
 ('Rafael Lima','rafael.lima@email.com','(19) 98888-1002','Campinas','SP','inscricao','ativo',ARRAY['TRABALHANDO ATUALMENTE'],true,'Contabilize','Auxiliar administrativo','2 anos',NULL),
 ('Camila Rocha','camila.rocha@email.com','(31) 98888-1003','Belo Horizonte','MG','triagem','ativo',ARRAY['Excel','PJ OK'],false,NULL,NULL,NULL,NULL),
 ('João Pedro Alves','joao.alves@email.com','(41) 98888-1004','Curitiba','PR','triagem','ativo',ARRAY['PJ OK'],true,'Distribuidora Norte','Assistente','1 ano',NULL),
 ('Larissa Mendes','larissa.mendes@email.com','(51) 98888-1005','Porto Alegre','RS','assessment','ativo',ARRAY['Assessment concluído'],false,NULL,NULL,NULL,78),
 ('Bruno Costa','bruno.costa@email.com','(81) 98888-1006','Recife','PE','assessment','ativo',ARRAY['Em análise'],true,'Grupo Aurora','Analista administrativo','3 anos',65),
 ('Fernanda Dias','fernanda.dias@email.com','(48) 98888-1007','Florianópolis','SC','entrevista','ativo',ARRAY['TRABALHANDO ATUALMENTE'],true,'Studio Vela','Assistente financeiro','2 anos',82),
 ('Gustavo Rocha','gustavo.rocha@email.com','(11) 98888-1008','São Paulo','SP','entrevista','ativo',ARRAY['PJ OK'],false,NULL,NULL,NULL,74),
 ('Paula Nogueira','paula.nogueira@email.com','(62) 98888-1009','Goiânia','GO','case','ativo',ARRAY['Case entregue'],false,NULL,NULL,NULL,80),
 ('Diego Martins','diego.martins@email.com','(71) 98888-1010','Salvador','BA','entrevista_gestor','ativo',ARRAY['Finalista'],false,NULL,NULL,NULL,85),
 ('Ana Beatriz Gomes','ana.gomes@email.com','(11) 98888-1011','São Paulo','SP','contratacao','ativo',ARRAY['Pronta para oferta'],false,NULL,NULL,NULL,91),
 ('Thiago Ramos','thiago.ramos@email.com','(11) 98888-1012','Osasco','SP','triagem','nao_atende_requisito',ARRAY[]::text[],false,NULL,NULL,NULL,NULL),
 ('Sofia Ramos','sofia.ramos@email.com','(11) 98888-1013','Santos','SP','entrevista','nao_avancou',ARRAY[]::text[],true,'Alfa Log','Recepcionista','1 ano',NULL)
) AS d(name,email,phone,city,state,stage_key,status,tags,employed,cur_company,cur_position,tenure,score);

INSERT INTO public.candidate_events (company_id, candidate_id, type, title, detail)
SELECT company_id, id, 'inscricao', 'Inscrição recebida', 'Candidatura registrada no processo'
FROM public.candidates WHERE job_id = '22222222-2222-2222-2222-222222222222';

INSERT INTO public.rejections (company_id, candidate_id, reason, requirement_id, notes)
SELECT company_id, id, 'Não atendeu requisito objetivo', '33333333-0000-0000-0000-000000000001', 'Respondeu "Não" para notebook próprio'
FROM public.candidates WHERE name = 'Thiago Ramos';

INSERT INTO public.rejections (company_id, candidate_id, reason, notes)
SELECT company_id, id, 'Desistência', 'Informou que aceitou outra proposta'
FROM public.candidates WHERE name = 'Sofia Ramos';

INSERT INTO public.interviews (company_id, candidate_id, stage_id, interviewer, interviewed_at, notes, positives, attention_points, recommendation)
SELECT c.company_id, c.id, c.stage_id, 'Marcos Ribeiro', current_date - 2,
  'Boa clareza ao explicar a rotina anterior.', 'Organização e comunicação direta.',
  'Pouca experiência com relatórios financeiros.', 'avancar'
FROM public.candidates c WHERE c.name = 'Fernanda Dias';

INSERT INTO public.case_submissions (company_id, candidate_id, job_case_id, status, link, notes, sent_at, delivered_at)
SELECT c.company_id, c.id, (SELECT id FROM public.job_cases WHERE job_id = c.job_id LIMIT 1), 'entregue',
  'https://docs.google.com/spreadsheets/exemplo', 'Entregou antes do prazo.', now() - interval '4 days', now() - interval '1 day'
FROM public.candidates c WHERE c.name = 'Paula Nogueira';
