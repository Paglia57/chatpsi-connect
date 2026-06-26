// Ferramenta plano_de_acao — invoca a persona dedicada a planos de ação via gateway chat().
// A vector store / file_search já está configurada no assistant correspondente na OpenAI
// (backend 'assistants'); o gateway resolve o assistant a partir do slug 'plano_acao'.

import { chat } from '../llm/index.ts';

export async function planoDeAcao(args: { user_query: string }): Promise<string> {
  try {
    const result = await chat({
      task: 'plano',
      personaSlug: 'plano_acao',
      userText: args.user_query,
      // Sem threadId: execução nova a cada chamada. Sem tools.
    });
    return result.text;
  } catch (err) {
    console.error('Erro em planoDeAcao:', err instanceof Error ? err.message : err);
    return 'Não consegui gerar o plano de ação agora.';
  }
}
