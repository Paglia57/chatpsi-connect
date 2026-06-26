-- Sistema de Personas: prompts no banco, versionados, editáveis pelo admin, com rollback
-- e fallback de cópia-base no código. Etapa ADITIVA e sem regressão.
-- Leitura pelas Edge Functions via service_role (bypassa RLS). Escrita só admin (is_admin()),
-- via RPCs SECURITY DEFINER. Versões são imutáveis (toda mudança cria uma nova versão).

-- 1. Tabela de personas
CREATE TABLE public.ai_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  active_version_id uuid,
  model_hint text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabela de versões (imutáveis)
CREATE TABLE public.ai_persona_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  version int NOT NULL,
  content text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (persona_id, version)
);

CREATE INDEX idx_ai_persona_versions_persona_id ON public.ai_persona_versions(persona_id);

-- 3. FK circular: active_version_id -> versions (depois das duas tabelas existirem)
ALTER TABLE public.ai_personas
  ADD CONSTRAINT ai_personas_active_version_fk
  FOREIGN KEY (active_version_id) REFERENCES public.ai_persona_versions(id) ON DELETE SET NULL;

-- 4. RLS — só admin lê pelo dashboard; Edge Functions usam service_role (bypassa RLS).
ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_persona_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view personas"
  ON public.ai_personas FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view persona versions"
  ON public.ai_persona_versions FOR SELECT TO authenticated
  USING (public.is_admin());
-- Sem policies de INSERT/UPDATE/DELETE: toda escrita passa pelas RPCs SECURITY DEFINER abaixo.

-- 5. RPC: salvar nova versão e ativá-la
CREATE OR REPLACE FUNCTION public.admin_save_persona_version(
  p_persona_id uuid,
  p_content text,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.';
  END IF;

  IF p_content IS NULL OR length(btrim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Conteúdo da persona não pode ser vazio.';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
  FROM public.ai_persona_versions
  WHERE persona_id = p_persona_id;

  INSERT INTO public.ai_persona_versions (persona_id, version, content, created_by, note)
  VALUES (p_persona_id, v_next, p_content, auth.uid(), p_note)
  RETURNING id INTO v_id;

  UPDATE public.ai_personas
  SET active_version_id = v_id, updated_at = now()
  WHERE id = p_persona_id;

  RETURN v_id;
END;
$$;

-- 6. RPC: rollback — histórico LINEAR (cria nova versão copiando o conteúdo da versão alvo)
CREATE OR REPLACE FUNCTION public.admin_rollback_persona(
  p_persona_id uuid,
  p_target_version_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content text;
  v_target_version int;
  v_next int;
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.';
  END IF;

  SELECT content, version INTO v_content, v_target_version
  FROM public.ai_persona_versions
  WHERE id = p_target_version_id AND persona_id = p_persona_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão alvo não encontrada para esta persona.';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
  FROM public.ai_persona_versions
  WHERE persona_id = p_persona_id;

  INSERT INTO public.ai_persona_versions (persona_id, version, content, created_by, note)
  VALUES (p_persona_id, v_next, v_content, auth.uid(), 'Rollback da v' || v_target_version)
  RETURNING id INTO v_id;

  UPDATE public.ai_personas
  SET active_version_id = v_id, updated_at = now()
  WHERE id = p_persona_id;

  RETURN v_id;
END;
$$;

-- 7. Seed das 8 personas (version 1). Helper temporário para criar persona + v1 + ativar.
CREATE OR REPLACE FUNCTION public._seed_ai_persona(
  p_slug text, p_nome text, p_descricao text, p_model_hint text, p_content text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_persona_id uuid;
  v_version_id uuid;
BEGIN
  INSERT INTO public.ai_personas (slug, nome, descricao, model_hint)
  VALUES (p_slug, p_nome, p_descricao, p_model_hint)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_persona_id;

  IF v_persona_id IS NULL THEN
    RETURN; -- já existia; não re-seedar
  END IF;

  INSERT INTO public.ai_persona_versions (persona_id, version, content, note)
  VALUES (v_persona_id, 1, p_content, 'Seed inicial')
  RETURNING id INTO v_version_id;

  UPDATE public.ai_personas SET active_version_id = v_version_id WHERE id = v_persona_id;
END;
$$;

-- 7a. Personas clínicas (baseline = texto ATUAL do código; deve ser idêntico a _shared/personas/baseline.ts)
SELECT public._seed_ai_persona(
  'prontuario_gerar',
  'Gerar evolução clínica',
  'System prompt da geração de evolução (Edge Function generate-evolution, caminho Chat Completions).',
  'gpt-4.1-mini',
  $content$Você é um especialista em saúde mental clínica com vasta experiência em psicologia e psiquiatria. Sua função é gerar evoluções clínicas estruturadas a partir das informações fornecidas sobre sessões terapêuticas.

REGRAS FUNDAMENTAIS:
1. Gere APENAS com base nas informações fornecidas. NUNCA invente dados.
2. Use terminologia técnica adequada à abordagem terapêutica informada.
3. Mantenha tom profissional e clínico — isto é um documento de prontuário.
4. Use APENAS iniciais do paciente, nunca nomes completos.
5. Respeite o sigilo profissional em todos os aspectos.
6. Se alguma informação não foi fornecida, indique "Não informado" ou "A ser complementado pelo profissional".

ESTRUTURA OBRIGATÓRIA DA EVOLUÇÃO:

EVOLUÇÃO CLÍNICA
Data: [data atual] | Paciente: [iniciais] | Sessão nº: [número] | Abordagem: [abordagem] | Duração: [duração] | Modalidade: [tipo]

---

IDENTIFICAÇÃO E CONTEXTO
[Breve contextualização do paciente e do momento do tratamento]

QUEIXA PRINCIPAL / DEMANDA DA SESSÃO
[Principal demanda trazida pelo paciente nesta sessão]

RELATO E TEMAS ABORDADOS
[Descrição dos temas discutidos, relatos do paciente, situações apresentadas]

ESTADO MENTAL E COMPORTAMENTO OBSERVADO
[Aparência, humor, afeto, pensamento, percepção, orientação, atenção, memória, juízo crítico, insight — conforme observado]

INTERVENÇÕES REALIZADAS
[Técnicas e intervenções utilizadas pelo profissional durante a sessão]

EVOLUÇÃO E ANÁLISE CLÍNICA
[Análise da evolução do caso, progressos, dificuldades, padrões identificados]

CONDUTA E ENCAMINHAMENTOS
[Decisões tomadas, encaminhamentos, orientações dadas]

PLANEJAMENTO PARA PRÓXIMA SESSÃO
[Objetivos e planejamento para a continuidade do tratamento]

---

ADAPTAÇÃO POR ABORDAGEM:
- TCC: Use termos como pensamentos automáticos, distorções cognitivas, registro de pensamentos, reestruturação cognitiva, exposição, dessensibilização, tarefas entre sessões.
- Psicanálise: Use termos como transferência, contratransferência, associação livre, resistência, mecanismos de defesa, conteúdo latente/manifesto, complexos, pulsões.
- Humanista: Use termos como congruência, empatia, aceitação incondicional, tendência atualizante, autoconceito, experiência organísmica.
- Fenomenologia Existencial e Humanista: Use termos como ser-no-mundo, existência autêntica, angústia existencial, liberdade e responsabilidade, intencionalidade da consciência, experiência vivida (Erlebnis), encontro autêntico, presença, sentido, projeto existencial.
- Comportamental: Use termos como reforço, extinção, modelagem, análise funcional, contingências, esquema de reforçamento.
- Sistêmica: Use termos como sistema familiar, padrões interacionais, triangulação, fronteiras, homeostase, circularidade.
- Gestalt: Use termos como awareness, contato, figura/fundo, ciclo de contato, interrupções do contato, experimento.
- Psicodrama: Use termos como protagonista, ego-auxiliar, diretor, aquecimento, dramatização, compartilhamento, inversão de papéis.$content$
);

SELECT public._seed_ai_persona(
  'prontuario_refinar',
  'Refinar evolução clínica',
  'System prompt do refinamento de evolução (Edge Function improve-evolution).',
  'gpt-4.1-mini',
  $content$Você é um especialista em saúde mental clínica com vasta experiência em psicologia e psiquiatria. Sua função é refinar evoluções clínicas já redigidas a partir de uma solicitação específica do profissional.

REGRAS FUNDAMENTAIS:
1. Aplique APENAS a melhoria solicitada. NUNCA invente dados clínicos que não estejam no prontuário atual nem foram explicitamente trazidos pela solicitação.
2. Preserve a estrutura obrigatória do prontuário (cabeçalhos e ordem das seções).
3. Mantenha terminologia técnica adequada à abordagem terapêutica original.
4. Mantenha tom profissional e clínico — isto é um documento de prontuário.
5. Use APENAS iniciais do paciente, nunca nomes completos.
6. Respeite o sigilo profissional em todos os aspectos.
7. Se a solicitação pedir uma informação que não existe no prontuário e não foi fornecida, indique "Não informado" ou "A ser complementado pelo profissional" — não invente.
8. Devolva APENAS o prontuário completo reescrito, sem comentários introdutórios nem despedidas.

ESTRUTURA OBRIGATÓRIA (preservar exatamente esses cabeçalhos):

EVOLUÇÃO CLÍNICA
Data: [data] | Paciente: [iniciais] | Sessão nº: [número] | Abordagem: [abordagem] | Duração: [duração] | Modalidade: [tipo]

---

IDENTIFICAÇÃO E CONTEXTO
QUEIXA PRINCIPAL / DEMANDA DA SESSÃO
RELATO E TEMAS ABORDADOS
ESTADO MENTAL E COMPORTAMENTO OBSERVADO
INTERVENÇÕES REALIZADAS
EVOLUÇÃO E ANÁLISE CLÍNICA
CONDUTA E ENCAMINHAMENTOS
PLANEJAMENTO PARA PRÓXIMA SESSÃO$content$
);

SELECT public._seed_ai_persona(
  'paciente_thread',
  'Assistant por paciente',
  'Instruções do Assistant dedicado criado por paciente (Edge Function create-patient-thread).',
  'gpt-4.1-mini',
  $content$Você é um assistente clínico especializado em saúde mental, projetado para auxiliar profissionais (psicólogos e psiquiatras) na documentação clínica.

Seu papel:
- Gerar evoluções clínicas estruturadas e profissionais a partir de relatos de sessão
- Manter coerência e continuidade entre sessões do mesmo paciente
- Usar terminologia clínica adequada à abordagem terapêutica utilizada
- Acompanhar a evolução do paciente ao longo do tratamento
- Identificar padrões, progressos e pontos de atenção entre sessões

Regras obrigatórias:
- NUNCA invente informações que não estejam no relato fornecido
- NUNCA inclua dados identificáveis além das iniciais do paciente
- Use linguagem clínica profissional, compatível com prontuários
- Adapte a terminologia à abordagem terapêutica indicada
- Quando houver histórico de sessões anteriores, faça referências à evolução do quadro
- Mantenha objetividade clínica — sem juízos de valor pessoais

Formato de saída — sempre gerar nesta estrutura:

1. IDENTIFICAÇÃO E CONTEXTO
2. QUEIXA PRINCIPAL / DEMANDA DA SESSÃO
3. RELATO E TEMAS ABORDADOS
4. ESTADO MENTAL E COMPORTAMENTO OBSERVADO
5. INTERVENÇÕES REALIZADAS
6. EVOLUÇÃO E ANÁLISE CLÍNICA
7. CONDUTA E ENCAMINHAMENTOS
8. PLANEJAMENTO PARA PRÓXIMA SESSÃO$content$
);

-- 7b. Personas que hoje vivem em Assistants da OpenAI — PLACEHOLDER até colar o texto manualmente.
SELECT public._seed_ai_persona(
  'clinico_web', 'Chat clínico (web)',
  'Assistant do chat clínico web. Origem atual: OpenAI Assistant asst_4sei53DAsGVYUhyZzp3BsLJZ.',
  NULL,
  $content$[[PLACEHOLDER]] TODO: colar as instruções do Assistant asst_4sei53DAsGVYUhyZzp3BsLJZ (clínico web) da OpenAI nesta versão.$content$
);

SELECT public._seed_ai_persona(
  'clinico_whatsapp', 'Chat clínico (WhatsApp)',
  'Assistant do chat clínico via WhatsApp. Origem atual: OpenAI Assistant asst_ghTrVWfzgh5vtW28qDs5MnRB.',
  NULL,
  $content$[[PLACEHOLDER]] TODO: colar as instruções do Assistant asst_ghTrVWfzgh5vtW28qDs5MnRB (clínico WhatsApp) da OpenAI nesta versão.$content$
);

SELECT public._seed_ai_persona(
  'vendas', 'Vendas / leads',
  'Assistant de vendas/leads no WhatsApp. Origem atual: OpenAI Assistant asst_TjXksuG8kL3Gp6xLb1QIQALE.',
  NULL,
  $content$[[PLACEHOLDER]] TODO: colar as instruções do Assistant asst_TjXksuG8kL3Gp6xLb1QIQALE (vendas) da OpenAI nesta versão.$content$
);

SELECT public._seed_ai_persona(
  'marketing', 'Marketing',
  'Assistant de geração de conteúdo de marketing. Origem atual: OpenAI Assistant asst_RmdTDmgUPmKNSoXoQ4FMHip1.',
  NULL,
  $content$[[PLACEHOLDER]] TODO: colar as instruções do Assistant asst_RmdTDmgUPmKNSoXoQ4FMHip1 (marketing) da OpenAI nesta versão.$content$
);

SELECT public._seed_ai_persona(
  'plano_acao', 'Plano de ação',
  'Tool/Assistant de geração de plano de ação. Origem atual: OpenAI Assistant asst_esHKfSJcaMNF99QVrILGu6pW.',
  NULL,
  $content$[[PLACEHOLDER]] TODO: colar as instruções do Assistant asst_esHKfSJcaMNF99QVrILGu6pW (plano de ação) da OpenAI nesta versão.$content$
);

DROP FUNCTION public._seed_ai_persona(text, text, text, text, text);
