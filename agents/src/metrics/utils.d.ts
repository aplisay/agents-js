import type { AgentMetrics, LLMMetrics, PipelineEOUMetrics, PipelineLLMMetrics, PipelineTTSMetrics, STTMetrics, TTSMetrics, VADMetrics } from './base.js';
export declare const logMetrics: (metrics: AgentMetrics) => void;
export declare const isLLMMetrics: (metrics: AgentMetrics) => metrics is LLMMetrics;
export declare const isPipelineLLMMetrics: (metrics: AgentMetrics) => metrics is PipelineLLMMetrics;
export declare const isVADMetrics: (metrics: AgentMetrics) => metrics is VADMetrics;
export declare const isPipelineEOUMetrics: (metrics: AgentMetrics) => metrics is PipelineEOUMetrics;
export declare const isTTSMetrics: (metrics: AgentMetrics) => metrics is TTSMetrics;
export declare const isPipelineTTSMetrics: (metrics: AgentMetrics) => metrics is PipelineTTSMetrics;
export declare const isSTTMetrics: (metrics: AgentMetrics) => metrics is STTMetrics;
//# sourceMappingURL=utils.d.ts.map