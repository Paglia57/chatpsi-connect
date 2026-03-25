

# Plano de Ajustes — CID-11, DSM-5-TR, Gravação de Áudio, Áreas de Atuação e Marketing

## 1. Atualizar CID-10 → CID-11 e DSM-5 → DSM-5-TR

**Arquivos**: `PatientFormDialog.tsx`, `PatientDetailPage.tsx`

- Label "Hipótese diagnóstica (CID-10)" → "Hipótese diagnóstica (CID-11)"
- Label "Hipótese diagnóstica (DSM-5)" → "Hipótese diagnóstica (DSM-5-TR)"
- Placeholder "Ex: F41.1" mantém (CID-11 usa mesmos códigos F)
- Placeholder "Ex: 300.02" → "Ex: Transtorno de ansiedade generalizada" (DSM-5-TR usa nomes descritivos)
- Campo `cid_10` e `dsm_5` no código e banco permanecem iguais (apenas labels visuais mudam)

## 2. Gravação de áudio no módulo de Evolução e Onboarding

**Arquivos**: `EvolutionInput.tsx`, `StepEvolution.tsx`

Atualmente ambos suportam apenas **upload** de arquivo de áudio. Adicionar botão de **gravação direta** usando o hook `useAudioRecording` já existente no projeto.

Na aba "Áudio da Sessão":
- Quando sem arquivo: mostrar **dois botões** lado a lado: "Gravar áudio" (ícone Mic) e "Enviar arquivo" (ícone Upload)
- Ao clicar "Gravar áudio": substituir área pelo estado de gravação com timer, botão parar (Stop) e cancelar
- Ao parar: o arquivo gravado preenche o `audioFile` como se tivesse sido feito upload
- Manter o drag-and-drop e upload de arquivo como alternativa
- Mesma lógica nos dois componentes (EvolutionInput e StepEvolution)

## 3. Campo "Outra" com input de texto nas Áreas de Atuação

**Arquivos**: `ProfilePage.tsx`, `StepProfile.tsx`

- Adicionar opção "Outra" na lista de checkboxes de SPECIALTIES
- Quando "Outra" estiver selecionada, exibir um `Input` abaixo com placeholder "Digite sua área de atuação"
- O texto digitado é salvo como item adicional no array `specialties` (ex: `["Ansiedade", "Outra: Neuropsicologia"]`)
- Ao desmarcar "Outra", limpar o campo e remover do array

## 4. Observação "edite antes de salvar" no conteúdo gerado (Marketing)

**Arquivo**: `MarketingInterface.tsx`

- Adicionar helper text abaixo do label "Conteúdo gerado (editável)": `<p className="text-xs text-muted-foreground">Edite antes de salvar</p>`
- O placeholder atual já diz "Edite antes de publicar" — atualizar para "Edite antes de salvar" para consistência com o CTA

---

## Arquivos a modificar

| Arquivo | Mudanças |
|---|---|
| `src/components/patients/PatientFormDialog.tsx` | Labels CID-11, DSM-5-TR |
| `src/pages/app/PatientDetailPage.tsx` | Labels CID-11, DSM-5-TR (se exibidos) |
| `src/components/evolution/EvolutionInput.tsx` | Botão gravar áudio com useAudioRecording |
| `src/components/onboarding/StepEvolution.tsx` | Botão gravar áudio com useAudioRecording |
| `src/pages/app/ProfilePage.tsx` | Checkbox "Outra" + Input texto |
| `src/components/onboarding/StepProfile.tsx` | Checkbox "Outra" + Input texto |
| `src/components/marketing/MarketingInterface.tsx` | Helper "Edite antes de salvar" |

