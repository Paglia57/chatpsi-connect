

# Plano de Revisao de Microcopy — Vocabulario Clinico e Copy Profissional

Revisao sistematica de textos em todos os modulos do app para alinhar ao vocabulario clinico obrigatorio, melhorar empty states, CTAs, labels, mensagens de erro e tooltips.

---

## 1. Evolucoes (`EvolutionInput.tsx` + `EvolutionOutput.tsx` + `EvolutionPage.tsx`)

**Labels**:
- "Nº sessão" → "Numero da sessao"
- "Tipo" → "Modalidade do atendimento"
- "Duração" → "Duracao da sessao"
- "Paciente *" → "Paciente vinculado *"
- "Sem paciente cadastrado" → "Evolucao avulsa (sem prontuario)"
- Helper "Evoluções sem paciente cadastrado não acumulam contexto na IA" → "Evolucoes avulsas nao acumulam contexto clinico na IA. Cadastre o paciente para melhores resultados."

**CTAs**:
- "Gerar Evolução" → "Gerar evolucao clinica"
- "Gerando evolução..." → "Gerando evolucao clinica..."
- "Salvar" → "Salvar no prontuario"
- "Copiar tudo" → "Copiar evolucao"
- "Editar" → "Editar texto"
- "Cancelar edição" → "Descartar alteracoes"
- "Gerar novamente" → "Regenerar evolucao"
- "Exportar PDF" → "Exportar como PDF"

**Breadcrumb**: "Nova Evolução" → "Nova Evolucao Clinica"

**Empty state (FirstTimeGuide)**: Copy ja esta bom. Ajustar CTA "Entendi, criar uma evolução!" → "Iniciar primeira evolucao"

**Erros**:
- `toast.error(err.message || "Erro ao gerar evolução")` → "Nao foi possivel gerar a evolucao. Verifique sua conexao e tente novamente."
- `toast.error("Erro ao salvar: " + ...)` → "Nao foi possivel salvar a evolucao. Tente novamente em alguns instantes."

**Loading**: "Analisando sessão e gerando evolução..." → "Analisando relato da sessao e estruturando a evolucao clinica..."

---

## 2. Pacientes (`PatientsPage.tsx` + `PatientFormDialog.tsx` + `PatientDetailPage.tsx`)

**PatientsPage**:
- Titulo "Meus Pacientes" → "Pacientes"
- CTA "Novo Paciente" → "Adicionar paciente"
- Placeholder busca "Buscar por nome..." → "Buscar paciente por nome..."
- Empty state titulo "Nenhum paciente cadastrado ainda" → "Seus pacientes aparecerão aqui"
- Empty state descricao: manter (ja esta boa)
- CTA empty "Cadastrar primeiro paciente" → "Adicionar primeiro paciente"
- Filtro "Ativos" / "Inativos" → "Em acompanhamento" / "Alta ou pausado"
- Badge "Ativo" → "Em acompanhamento", "Inativo" → "Pausado"
- Empty filtro "Nenhum paciente encontrado" → "Nenhum paciente corresponde aos filtros aplicados"
- Beneficio cards: "Histórico de sessões organizado por paciente" ok, "Contexto automático para a IA nas evoluções" ok, "Acompanhamento de progresso ao longo do tempo" ok

**PatientFormDialog**:
- Titulo "Novo Paciente" → "Adicionar paciente"
- Titulo edicao "Editar Paciente" → "Editar prontuario"
- Secao "Dados de Identificação" → "Identificacao do paciente"
- Secao "Dados Clínicos" → "Informacoes clinicas"
- Secao "Configurações da Sessão" → "Configuracoes do atendimento"
- Label "Nome completo *" → "Nome completo do paciente *"
- Label "Iniciais *" → "Iniciais do paciente *"
- Label "Queixa principal / motivo do tratamento" → "Queixa principal"
- Label "Diagnóstico CID-10" → "Hipotese diagnostica (CID-10)"
- Label "Diagnóstico DSM-5" → "Hipotese diagnostica (DSM-5)"
- Label "Medicação em uso" → "Medicacao atual"
- Label "Observações gerais" → "Observacoes clinicas"
- Label "Dia e horário habitual" → "Dia e horario do atendimento"
- Label "Tipo de atendimento" → "Modalidade do atendimento"
- Label "Frequência" → "Frequencia dos atendimentos"
- CTA "Cadastrar Paciente" → "Adicionar paciente"
- CTA edicao "Salvar Alterações" → "Salvar alteracoes no prontuario"
- Erro validacao "Nome e iniciais são obrigatórios" → "Informe o nome completo e as iniciais do paciente"
- Toast sucesso "Paciente cadastrado com sucesso!" → "Paciente adicionado ao seu prontuario"
- Toast sucesso edicao "Paciente atualizado!" → "Prontuario atualizado com sucesso"
- Toast warning thread "Paciente salvo, mas o contexto de IA será criado na próxima evolução" → "Paciente adicionado. O contexto de IA sera ativado na primeira evolucao."

**PatientDetailPage**:
- Secao "Dados Clínicos" → "Informacoes clinicas"
- Secao "Histórico de Evoluções" → "Evolucoes clinicas"
- CTA "Nova Evolução" → "Gerar evolucao"
- Empty evolucoes "Nenhuma evolução registrada para este paciente." → "Nenhuma evolucao clinica gerada para este paciente. Gere a primeira apos a proxima sessao."
- "Contexto Acumulado da IA" → "Contexto clinico acumulado"
- "O contexto de IA ainda não foi ativado para este paciente." → "A IA ainda nao possui historico deste paciente. Ative para que as evolucoes considerem sessoes anteriores."
- CTA "Ativar contexto de IA" → "Ativar contexto clinico"

---

## 3. Historico (`HistoryPage.tsx`)

- Empty state "Nenhuma evolução encontrada" → "O historico consolida todas as evolucoes dos seus pacientes. Gere sua primeira evolucao para comecar a construi-lo."
- Adicionar CTA no empty: botao "Gerar evolucao" → navega para `/app/evolucao`
- Dialog titulo "Evolução —" → "Evolucao clinica —"
- Toast "Erro ao excluir" → "Nao foi possivel excluir a evolucao. Tente novamente."
- Toast "Evolução excluída" → "Evolucao removida do historico"
- Dialog excluir titulo "Excluir evolução?" → "Excluir esta evolucao?"
- Dialog excluir descricao: manter (ja contextual)
- CTA "Salvar" (no dialog edicao) → "Salvar alteracoes"
- Toast "Erro ao salvar alterações" → "Nao foi possivel salvar as alteracoes. Tente novamente."
- Toast "Evolução atualizada!" → "Evolucao atualizada com sucesso"
- Toast "Evolução copiada!" → "Evolucao copiada para a area de transferencia"

---

## 4. Chat Clinico (`ChatInterface.tsx`)

- Empty state titulo "Bem-vindo ao ChatPsi!" → "Chat Clinico"
- Empty state descricao (subscriber) "Envie mensagens, áudios, imagens ou documentos para começar a conversar com a IA." → "O Chat Clinico e seu assistente especializado. Tire duvidas sobre abordagens, CID, manejo clinico e mais."
- Empty state descricao (no subscription) "Você precisa de uma assinatura ativa para começar a conversar." → "Assinatura necessaria para acessar o Chat Clinico."
- CTA "Ativar Assinatura" → "Assinar para acessar"
- FirstTimeGuide CTA "Entendi, começar a conversar!" → "Iniciar conversa"
- Toast "Gravação iniciada" → manter
- Toast "Gravação concluída" → manter
- Toast "Gravação cancelada" → manter
- Toast erro "Erro ao carregar mensagens" → "Nao foi possivel carregar o historico de mensagens. Verifique sua conexao."
- Toast "Resposta demorou mais que o esperado" → "A resposta esta demorando mais que o esperado. Mensagens atualizadas automaticamente."
- Toast "Erro ao enviar mensagem" → "Nao foi possivel enviar a mensagem. Verifique sua conexao e tente novamente."
- Toast "Assinatura necessária" → "Assinatura necessaria para enviar mensagens no Chat Clinico."
- Toast "Chat atualizado" descricao "Resposta interrompida e mensagens recarregadas." → "Historico de mensagens recarregado."

---

## 5. Planos Terapeuticos (`BuscaPlanoInterface.tsx`)

- FirstTimeGuide titulo "Busca Plano de Ação" → "Planos Terapeuticos"
- FirstTimeGuide descricao "Descreva o caso clínico e receba um plano de ação terapêutico..." → "Descreva o quadro clinico do paciente e receba planos terapeuticos estruturados com objetivos e intervencoes baseadas em evidencias."
- Empty state titulo "Busca Plano de Ação" → "Planos Terapeuticos"
- Empty state descricao "Descreva o caso clínico ou situação e receba um plano de ação terapêutico personalizado." → "Planos terapeuticos estruturados com objetivos, intervencoes e prazos. Descreva o quadro clinico para comecar."
- Sugestoes: "Plano de ação para..." → "Plano terapeutico para..."
- CTA FirstTimeGuide "Entendi, buscar um plano!" → "Buscar plano terapeutico"
- Toast "Nova conversa" → "Nova consulta"
- Toast "O contexto será renovado na próxima mensagem." → "O contexto sera renovado na proxima consulta."
- Botao "Nova conversa" → "Nova consulta"

---

## 6. Artigos Cientificos (`BuscaArtigosInterface.tsx`)

- FirstTimeGuide titulo "Busca Artigos Científicos" → "Artigos Cientificos"
- CTA "Entendi, buscar artigos!" → "Buscar artigo cientifico"
- Empty state titulo "Busca Artigos Científicos" → "Artigos Cientificos"
- Empty state descricao "Pesquise artigos científicos relevantes para embasar sua prática clínica." → "Busque artigos cientificos relevantes para suas hipoteses diagnosticas e abordagens terapeuticas."
- Placeholder "Digite sua pergunta sobre artigos científicos..." → "Descreva o tema, tecnica ou quadro clinico que deseja pesquisar..."
- Toast sucesso "Artigos processados com sucesso!" → "Artigos encontrados"
- Toast erro "Ocorreu um erro ao processar sua solicitação." → "Nao foi possivel buscar artigos. Verifique sua conexao e tente novamente."
- Toast limite "Você atingiu o limite de buscas gratuitas este mês. Assine para continuar." → "Limite de buscas atingido este mes. Assine para continuar pesquisando."

---

## 7. Marketing (`MarketingInterface.tsx`)

- Titulo "IA de Marketing" → "Marketing para sua pratica"
- Subtitulo "Gere textos de marketing com inteligência artificial" → "Gere conteudo profissional para suas redes sociais com IA especializada em saude mental."
- Label "Pedido ao assistente" → "Descreva o conteudo desejado"
- Placeholder "Descreva o que você quer que a IA crie..." → "Ex: Post para Instagram sobre a importancia da terapia para ansiedade"
- Label "Texto gerado / editável" → "Conteudo gerado (editavel)"
- Placeholder "O texto gerado pela IA aparecerá aqui e poderá ser editado..." → "O conteudo gerado pela IA aparecera aqui. Edite antes de publicar."
- CTA "Gerar com IA" → "Gerar conteudo"
- CTA "Salvar" → "Salvar conteudo"
- Tab "Novo Texto" → "Criar conteudo"
- Tab "Histórico" → "Conteudos salvos"
- CTA "Novo" → "Novo conteudo"
- Empty historico "Nenhum texto salvo ainda" → "Seus conteudos gerados aparecerão aqui. Crie o primeiro para comecar."
- FirstTimeGuide CTA "Entendi, criar um texto!" → "Criar primeiro conteudo"
- Toast "Texto gerado com IA!" → "Conteudo gerado com sucesso"
- Toast "Texto salvo com sucesso!" → "Conteudo salvo"
- Toast "Texto excluído com sucesso!" → "Conteudo removido"
- Dialog excluir "Confirmar exclusão" → "Excluir este conteudo?"
- Dialog excluir descricao "Tem certeza que deseja excluir este texto? Esta ação não pode ser desfeita." → "Este conteudo sera permanentemente removido. Esta acao nao pode ser desfeita."
- Toast erro vazio "Digite um pedido para o assistente" → "Descreva o conteudo que deseja gerar"
- Toast erro salvar "Não há texto para salvar" → "Nenhum conteudo para salvar. Gere um conteudo primeiro."
- Toast erro generico "Erro" titulo → remover titulo generico, usar descricao contextual: "Nao foi possivel gerar o conteudo. Tente novamente." / "Nao foi possivel salvar. Tente novamente."

---

## 8. Perfil (`ProfilePage.tsx`)

- Titulo "Perfil Profissional" → "Seu perfil clinico"
- Label "Nome completo" → "Nome completo do profissional"
- Label "Apelido" → "Como prefere ser chamado"
- Label "CRP" → "Registro profissional (CRP/CRM)"
- Helper CRP: manter
- Label "Abordagem principal" → "Abordagem terapeutica principal"
- Helper abordagem "Será pré-selecionada ao criar novas evoluções" → "Pre-selecionada automaticamente ao gerar evolucoes clinicas"
- Label "Especialidades" → "Areas de atuacao"
- Helper especialidades "Ajudam a IA a personalizar sugestões e planos de ação" → "A IA priorizara conteudos e sugestoes dessas areas"
- CTA "Salvar alterações" → "Salvar perfil"
- Toast sucesso "Perfil atualizado!" → "Perfil clinico atualizado"
- Toast erro "Erro ao salvar: ..." → "Nao foi possivel atualizar o perfil. Tente novamente."
- Toast avatar "Foto atualizada!" → "Foto de perfil atualizada"
- Toast avatar erro "Erro ao enviar foto" → "Nao foi possivel enviar a foto. Tente com um arquivo menor."

---

## 9. Indicacoes (`ReferralsPage.tsx`)

- Sem mudancas significativas necessarias (copy ja esta contextual).

---

## 10. Logger / Mensagens genericas (`logger.ts`)

- Verificar `GENERIC_ERROR_MESSAGES` — se houver mensagens tecnicas expostas, substituir por mensagens amigaveis seguindo o padrao "O que aconteceu + O que fazer".

---

## Arquivos a modificar

| Arquivo | Mudancas |
|---|---|
| `src/components/evolution/EvolutionInput.tsx` | Labels, CTAs, helpers, placeholder |
| `src/components/evolution/EvolutionOutput.tsx` | CTAs, loading copy |
| `src/pages/app/EvolutionPage.tsx` | Breadcrumb, erros, FirstTimeGuide CTA |
| `src/pages/app/PatientsPage.tsx` | Titulo, CTAs, empty states, badges, filtros |
| `src/components/patients/PatientFormDialog.tsx` | Labels, secoes, CTAs, validacao, toasts |
| `src/pages/app/PatientDetailPage.tsx` | Secoes, CTAs, empty states, contexto IA |
| `src/pages/app/HistoryPage.tsx` | Empty state com CTA, toasts, dialog copy |
| `src/components/chat/ChatInterface.tsx` | Empty states, toasts, CTAs |
| `src/components/busca-plano/BuscaPlanoInterface.tsx` | Titulos, descricoes, sugestoes, toasts |
| `src/components/busca-artigos/BuscaArtigosInterface.tsx` | Titulos, descricoes, placeholder, toasts |
| `src/components/marketing/MarketingInterface.tsx` | Titulo, labels, CTAs, tabs, empty state, toasts |
| `src/pages/app/ProfilePage.tsx` | Titulo, labels, helpers, CTAs, toasts |

Nenhuma logica de negocio sera alterada. Apenas strings de texto, labels e mensagens.

