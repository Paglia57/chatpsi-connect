

## Plano: Módulo de Evolução Clínica por IA

Módulo grande: banco de dados, edge function, layout com sidebar, 3 páginas novas.

---

### 1. Banco de Dados

**Adicionar colunas ao `profiles` existente** (não recriar):
- `crp` (text)
- `main_approach` (text)
- `specialties` (text[])
- `avatar_url` (text)

**Nova tabela `evolutions`:**
- id, user_id, patient_initials, session_number, session_duration, session_type, approach, input_type, input_content, output_content, audio_url, created_at, updated_at
- RLS: user_id = auth.uid() para SELECT, INSERT, UPDATE, DELETE

**Storage bucket:** `session-audios` (privado, RLS por usuário autenticado)

---

### 2. Edge Function: `generate-evolution`

- Recebe dados da sessão + input (texto ou audio_url)
- Se áudio: transcreve via OpenAI Whisper, depois gera evolução
- Se texto: gera evolução direto via OpenAI GPT-4
- System prompt de especialista clínico com terminologia da abordagem selecionada
- Retorna evolution_text estruturado

**Pré-requisito:** Será necessário adicionar um secret `OPENAI_API_KEY` — não existe atualmente no projeto. Vou solicitar ao usuário.

---

### 3. Layout do App (`/app/*`)

**Novo layout `AppLayout.tsx`** com:
- Sidebar à esquerda (colapsável em mobile via Sheet) usando cores sidebar-*
- Logo ChatPsi no topo
- Menu: Nova Evolução (Plus), Histórico (ClipboardList), Perfil (User)
- Rodapé: avatar + nome + logout
- Links admin condicionais (se isAdmin)
- Área principal à direita

---

### 4. Páginas

**`/app` → redirect para `/app/evolucao`**

**`/app/evolucao` — Tela principal:**
- Coluna esquerda (input): Card com seletor abordagem, dados sessão, Tabs (Áudio/Texto), botão "Gerar Evolução"
- Coluna direita (output): Card com estado vazio, loading (Skeleton + Progress), e evolução estruturada
- Barra de ações: Copiar, Editar, Salvar, Regenerar, Exportar PDF
- Upload de áudio via drag-and-drop para bucket `session-audios`

**`/app/historico` — Lista de evoluções:**
- Cards com data, paciente, abordagem, preview
- Filtros + busca
- Dialog para ver evolução completa
- Excluir com AlertDialog

**`/app/perfil` — Configurações:**
- Formulário com campos profissionais (nome, CRP, abordagem, especialidades)
- Upload avatar
- Botão salvar

---

### 5. Roteamento (App.tsx)

Adicionar rotas:
```
/app → redirect para /app/evolucao
/app/evolucao → EvolutionPage
/app/historico → HistoryPage  
/app/perfil → ProfilePage
```

Atualizar `Index.tsx`: redirecionar usuário logado para `/app` ao invés de `/chat`.

---

### 6. Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| Criar | Migration SQL (colunas profiles + tabela evolutions + bucket + RLS) |
| Criar | `supabase/functions/generate-evolution/index.ts` |
| Criar | `src/components/app/AppLayout.tsx` (layout com sidebar) |
| Criar | `src/components/app/AppSidebar.tsx` (sidebar do app) |
| Criar | `src/pages/app/EvolutionPage.tsx` (tela principal) |
| Criar | `src/components/evolution/EvolutionInput.tsx` (coluna input) |
| Criar | `src/components/evolution/EvolutionOutput.tsx` (coluna output) |
| Criar | `src/pages/app/HistoryPage.tsx` (histórico) |
| Criar | `src/pages/app/ProfilePage.tsx` (perfil profissional) |
| Modificar | `src/App.tsx` — novas rotas /app/* |
| Modificar | `src/pages/Index.tsx` — redirect para /app |
| Modificar | `supabase/config.toml` — função generate-evolution |

---

### 7. Dependência: OpenAI API Key

O edge function precisa de uma `OPENAI_API_KEY` para transcrição (Whisper) e geração (GPT-4). Esse secret não existe no projeto. Vou solicitar ao usuário que forneça a chave antes de implementar o edge function, ou posso usar o Lovable AI Gateway como alternativa (sem Whisper nesse caso — apenas geração de texto).

**Opção recomendada:** Usar OpenAI diretamente (suporta Whisper + GPT-4). Será solicitado o secret.

