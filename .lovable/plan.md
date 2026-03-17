

## Plano: Módulo de Cadastro de Pacientes com Threads OpenAI

Este é um recurso grande. Vou dividi-lo em etapas claras.

---

### Etapa 1: Banco de Dados

**Migração SQL:**

1. Criar tabela `patients` com todos os campos solicitados (full_name, initials, date_of_birth, gender, approach, main_complaint, cid_10, dsm_5, medication, notes, default_session_duration, default_session_type, session_day_time, session_frequency, status, openai_thread_id, openai_assistant_id, total_sessions, last_session_at, user_id, created_at, updated_at)
2. RLS: políticas separadas para SELECT, INSERT, UPDATE, DELETE — todas com `auth.uid() = user_id`
3. Índice em `(user_id, full_name)`
4. Trigger `update_updated_at_column` na tabela
5. Adicionar coluna `patient_id uuid references patients(id)` na tabela `evolutions` (nullable)

---

### Etapa 2: Edge Function — `create-patient-thread`

Nova edge function que:
1. Recebe dados do paciente (nome, abordagem, queixa, CID, DSM, medicação, notas)
2. Cria um Assistant na OpenAI com o system prompt clínico especializado (conforme especificado)
3. Cria uma Thread na OpenAI
4. Envia mensagem inicial na Thread com contexto do paciente
5. Retorna `{ thread_id, assistant_id }`

Usa `OPENAI_API_KEY` (já configurada). Adicionar ao `config.toml` com `verify_jwt = false` (validação manual no código).

---

### Etapa 3: Edge Function — Ajustar `generate-evolution`

Adicionar fluxo alternativo quando `patient_id` é fornecido:

1. Buscar paciente no banco (thread_id, assistant_id)
2. Transcrever áudio via Whisper (se necessário — já existe)
3. Adicionar mensagem na Thread do paciente com o relato da sessão
4. Criar um Run com o Assistant e fazer polling até completar
5. Coletar resposta e retornar (sem streaming SSE neste caso — Assistants API não suporta streaming da mesma forma, mas pode-se usar polling e retornar o texto completo, ou usar streaming events)
6. Atualizar `total_sessions` e `last_session_at` do paciente

Quando **não há** patient_id: manter o fluxo atual (Chat Completions com streaming).

**Nota técnica importante:** A Assistants API da OpenAI usa polling (create run → check status → get messages) ao invés de streaming direto. O frontend precisará de ajuste para lidar com resposta não-streaming quando um paciente cadastrado é usado. Alternativa: usar streaming events da Assistants API (`stream: true` no run).

---

### Etapa 4: Frontend — Página de Pacientes

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/app/PatientsPage.tsx` | Listagem com busca, filtros (abordagem, status), ordenação, grid de cards |
| `src/pages/app/PatientDetailPage.tsx` | Ficha do paciente com dados clínicos, histórico de evoluções filtrado, seção de contexto IA |
| `src/components/patients/PatientFormDialog.tsx` | Dialog para cadastro/edição com todos os campos especificados |
| `src/components/patients/PatientSelector.tsx` | Combobox (Popover + Command) para seleção na tela de evolução |

---

### Etapa 5: Ajustar EvolutionInput

- Substituir campo "Nome ou iniciais" pelo `PatientSelector` (combobox searchable)
- Auto-preencher abordagem, duração, tipo, nº sessão ao selecionar paciente
- Mini-card com info do paciente selecionado
- Link "Gerar evolução sem paciente cadastrado" para manter comportamento avulso
- Passar `patient_id` no `onGenerate`

---

### Etapa 6: Ajustar EvolutionPage

- Passar `patient_id` para a edge function quando disponível
- Salvar `patient_id` na tabela `evolutions` ao salvar

---

### Etapa 7: Navegação e Rotas

- Adicionar "Pacientes" (ícone Users) no `ChatSidebar.tsx` entre "Evolução Clínica" e "Histórico"
- Adicionar rotas `/app/pacientes` e `/app/pacientes/:id` no `App.tsx`

---

### Detalhes técnicos da Assistants API

A edge function `create-patient-thread` fará 3 chamadas à API OpenAI:
```
POST /v1/assistants          → cria assistant
POST /v1/threads             → cria thread
POST /v1/threads/{id}/messages → mensagem inicial
```

A `generate-evolution` (com patient_id) fará:
```
POST /v1/threads/{id}/messages → adiciona relato
POST /v1/threads/{id}/runs     → executa assistant (com stream)
```

Para manter streaming, usaremos `stream: true` no run creation, que retorna Server-Sent Events compatíveis com o frontend atual.

---

### Tratamento de erros

- Se criação da Thread falhar: salvar paciente sem thread_id + toast de aviso
- Na ficha do paciente sem thread_id: botão "Ativar contexto de IA" que chama a edge function novamente
- Erros 429/402 da OpenAI: mensagens amigáveis

---

### Ordem de implementação

1. Migração SQL (patients + patient_id em evolutions)
2. Edge function `create-patient-thread`
3. Frontend: PatientFormDialog, PatientsPage, PatientDetailPage
4. Frontend: PatientSelector + ajustes no EvolutionInput/EvolutionPage
5. Sidebar + rotas
6. Ajuste na edge function `generate-evolution` para Threads

