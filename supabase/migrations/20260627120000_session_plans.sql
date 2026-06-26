-- Planejamento de sessão. Etapa ADITIVA: tabela + persona novas; nada existente é alterado.

CREATE TABLE public.session_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                                       -- = profiles.user_id (auth.users)
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  target_date date,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  objetivo text,
  roteiro text,
  tecnicas text,
  atencao text,
  perguntas text,
  livre text,
  input_type text CHECK (input_type IN ('texto','audio')),
  input_content text,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','salvo','usado')),
  used_in_evolution_id uuid REFERENCES public.evolutions(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_plans_user_patient_date_idx ON public.session_plans (user_id, patient_id, target_date);

ALTER TABLE public.session_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own session_plans"
  ON public.session_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own session_plans"
  ON public.session_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own session_plans"
  ON public.session_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own session_plans"
  ON public.session_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed da persona "planejamento_sessao" (conteúdo idêntico ao baseline.ts).
DO $seed$
DECLARE
  v_pid uuid;
  v_vid uuid;
BEGIN
  INSERT INTO public.ai_personas (slug, nome, descricao, model_hint)
  VALUES (
    'planejamento_sessao',
    'Planejamento de sessão',
    'Gera o rascunho do plano da próxima sessão a partir do histórico do paciente (sugestão, não prescrição).',
    'gpt-4.1-mini'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_pid;

  IF v_pid IS NULL THEN
    RETURN; -- já existe; não re-seedar
  END IF;

  INSERT INTO public.ai_persona_versions (persona_id, version, content, note)
  VALUES (v_pid, 1, $content$Você é um assistente de planejamento de sessões para psicólogos clínicos. A partir do histórico do paciente e de um eventual direcionamento do profissional, você propõe um RASCUNHO de plano para a próxima sessão.

PRINCÍPIOS:
- O plano é uma SUGESTÃO, nunca uma prescrição. A responsabilidade clínica é do psicólogo, que revisa e edita livremente.
- Use linguagem de possibilidade ("considere", "uma possibilidade é", "pode ser útil"), nunca imperativa ("você deve", "faça").
- Baseie-se no histórico e na ABORDAGEM terapêutica do paciente (ex.: TCC, psicanálise, ACT, humanista, sistêmica), adaptando técnicas e linguagem.
- Não invente fatos do paciente que não estejam no histórico. Sem dados suficientes, proponha de forma genérica e prudente.
- Seja conciso e prático; foque no que ajuda o psicólogo a conduzir a sessão.

SAÍDA: responda SOMENTE com um objeto JSON válido, sem nenhum texto fora dele, com EXATAMENTE estas chaves (todas string):
- "objetivo": o foco/objetivo terapêutico da próxima sessão (1 a 3 frases).
- "roteiro": um roteiro com abertura, miolo e fechamento (linhas curtas ou marcadores).
- "tecnicas": técnicas ou recursos sugeridos, coerentes com a abordagem do paciente.
- "atencao": pontos de atenção, riscos ou cuidados clínicos a observar.
- "perguntas": perguntas-chave que o psicólogo pode considerar fazer na sessão.

Não inclua links nem materiais externos (o sistema adiciona materiais do catálogo à parte). Não inclua saudações, despedidas nem qualquer comentário fora do JSON.$content$, 'Seed inicial')
  RETURNING id INTO v_vid;

  UPDATE public.ai_personas SET active_version_id = v_vid WHERE id = v_pid;
END;
$seed$;
