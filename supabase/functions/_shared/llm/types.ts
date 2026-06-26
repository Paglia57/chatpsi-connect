// Tipos públicos e estáveis do gateway de IA. Ficam separados de index.ts para evitar
// import circular entre o dispatcher (index.ts) e as implementações (responses.ts/shadow.ts).

/** Parte de conteúdo da mensagem do usuário (texto, imagem ou arquivo já no OpenAI). */
export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image"; dataUrl: string } // data:...;base64,... (ou URL https)
  | { type: "file"; fileId: string }; // id de arquivo já enviado à OpenAI (Files API)

/** Ferramenta chamável pelo modelo. `parameters` (JSON Schema) é exigido pelo backend
 *  Responses; no backend Assistants o schema vive no Assistant e estes campos são ignorados. */
export type ChatTool = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<string>;
};

export type ChatOptions = {
  /** Ex.: "clinico" | "vendas" | "marketing" | "plano". Rótulo p/ logs e roteamento futuro. */
  task: string;
  /** Atalho para um único conteúdo de texto. Use `content` para multimodal. */
  userText?: string;
  /** Conteúdo rico (texto + imagens + arquivos). Tem precedência sobre userText se presente. */
  content?: ChatContentPart[];
  /** Slug da persona — as instruções (system prompt) vêm de getPersona(slug). */
  personaSlug?: string;
  /** Instruções diretas (alternativa a personaSlug). */
  instructions?: string;
  /** Assistant ID explícito (compat/legado e fluxo por paciente). */
  assistantId?: string;
  /** Estado de conversa. Assistants: thread id. Responses: previous_response_id. */
  threadId?: string;
  /** Handlers (e schema) das ferramentas. */
  tools?: ChatTool[];
  /** Modelo (Responses). Default: model_hint da persona ou LLM_DEFAULT_MODEL. */
  model?: string;
  /** Chave para allowlist do modo sombra (telefone/user_id). */
  shadowKey?: string;
};

export type ChatResult = {
  text: string;
  /** Assistants: thread id reutilizável. Responses: id do último response (encadeamento). */
  threadId: string;
  usage?: { prompt: number; completion: number; total: number };
};

/** Opções já resolvidas (instruções/assistant/modelo) passadas às implementações. */
export type ResolvedChat = {
  instructions?: string;
  assistantId?: string;
  model: string;
};
