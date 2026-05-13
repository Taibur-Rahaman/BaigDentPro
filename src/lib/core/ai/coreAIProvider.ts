/**
 * Pluggable AI surface — rule-based default; swap for LLM without changing call sites.
 * IMPORTANT: suggestions only; never persists or mutates clinical state.
 */
export type AIEngineKind = 'rules' | 'llm_stub';

export interface AIProviderContext {
  engine: AIEngineKind;
  locale?: string;
}

export const defaultAIProviderContext: AIProviderContext = { engine: 'rules' };
