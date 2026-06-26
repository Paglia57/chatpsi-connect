// Execução de tool calls compartilhada pelos dois backends. Faz lookup do handler local,
// parseia os argumentos (string JSON) e devolve a saída como string, sempre sem lançar
// (erros viram texto, para o modelo seguir o fluxo).

import type { ChatTool } from "./types.ts";

export async function executeTool(
  toolsByName: Map<string, ChatTool>,
  name: string,
  rawArgs: string | undefined,
): Promise<string> {
  const tool = toolsByName.get(name);
  if (!tool) return `Ferramenta "${name}" não disponível.`;

  let args: Record<string, unknown> = {};
  try {
    if (rawArgs) args = JSON.parse(rawArgs);
  } catch {
    args = {};
  }

  try {
    return await tool.handler(args);
  } catch (err) {
    return `Erro ao executar a ferramenta "${name}": ${err instanceof Error ? err.message : String(err)}`;
  }
}

export function toolsToMap(tools: ChatTool[] = []): Map<string, ChatTool> {
  return new Map(tools.map((t) => [t.name, t]));
}
