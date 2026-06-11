// Ferramenta plano_de_acao — invoca o assistant OpenAI dedicado a planos de ação.
// A vector store / file_search já está configurada nesse assistant na OpenAI;
// aqui apenas o invocamos via gateway chat().

import { chat } from '../llm/index.ts';

const PLANO_ASSISTANT_ID = 'asst_esHKfSJcaMNF99QVrILGu6pW'; // "ChatPSI - V2 - Plano de ação"

export async function planoDeAcao(args: { user_query: string }): Promise<string> {
  try {
    const result = await chat({
      task: 'plano',
      assistantId: PLANO_ASSISTANT_ID,
      userText: args.user_query,
      // Sem threadId: execução nova a cada chamada. Sem tools.
    });
    return result.text;
  } catch (err) {
    console.error('Erro em planoDeAcao:', err instanceof Error ? err.message : err);
    return 'Não consegui gerar o plano de ação agora.';
  }
}
