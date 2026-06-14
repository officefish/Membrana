export type ClaudeMessageRole = 'user' | 'assistant';

export interface ClaudeChatMessage {
  role: ClaudeMessageRole;
  content: string;
}

export interface ClaudeAskBody {
  model?: string;
  system?: string;
  messages: ClaudeChatMessage[];
  max_tokens?: number;
}

export interface ClaudeAskResponse {
  text: string;
  model: string;
  stop_reason: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export type ContextRef =
  | { source: 'github-issue'; issueNumber: number }
  | { source: 'linear'; ticketId: string }
  | { source: 'raw'; text: string };

export interface PersonaAskBody {
  question: string;
  context?: ContextRef;
  includeStrategicDocs?: boolean;
}

export interface PersonaAskResponse {
  text: string;
  persona: string;
  sources: { document: string; length: number }[];
}
