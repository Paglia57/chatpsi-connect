// Teste manual ponta a ponta do gateway de IA (_shared/llm).
//
// Prova o ciclo: thread -> run -> tool-loop -> resposta, usando o assistant
// clínico atual e STUBS para as ferramentas que ele pode chamar.
//
// NÃO escreve nada no banco (não usa Supabase).
//
// Como rodar (PowerShell):
//   $env:OPENAI_API_KEY = "<sua-chave>"
//   deno run --allow-net --allow-env supabase/functions/_shared/llm/test.ts
//
// (A chave é lida via Deno.env pelo módulo; nunca é impressa.)

import { chat, type ChatTool } from './index.ts';

const CLINICAL_ASSISTANT_ID = 'asst_ghTrVWfzgh5vtW28qDs5MnRB';

// Stubs das duas ferramentas que o assistant clínico pode acionar.
const tools: ChatTool[] = [
  {
    name: 'plano_de_acao',
    handler: async (args) => {
      console.log('[stub] plano_de_acao chamado com args:', JSON.stringify(args));
      return 'função ainda não implementada';
    },
  },
  {
    name: 'buscar_artigos',
    handler: async (args) => {
      console.log('[stub] buscar_artigos chamado com args:', JSON.stringify(args));
      return 'função ainda não implementada';
    },
  },
];

async function main() {
  console.log('Chamando chat() contra o assistant clínico...\n');

  const result = await chat({
    task: 'clinico',
    assistantId: CLINICAL_ASSISTANT_ID,
    userText: 'Olá! Pode me dar uma sugestão de plano de ação para ansiedade antes de dormir?',
    tools,
  });

  console.log('\n===== RESPOSTA DO ASSISTANT =====');
  console.log(result.text);
  console.log('\n===== METADADOS =====');
  console.log('threadId:', result.threadId);
  if (result.usage) {
    console.log('usage:', JSON.stringify(result.usage));
  }
  console.log('\nCiclo thread -> run -> tool-loop -> resposta concluído com sucesso.');
}

main().catch((err) => {
  console.error('\nFalha no teste:', err instanceof Error ? err.message : err);
  Deno.exit(1);
});
