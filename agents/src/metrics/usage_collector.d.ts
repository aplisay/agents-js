import type { AgentMetrics } from './base.js';
export interface UsageSummary {
    llmPromptTokens: number;
    llmCompletionTokens: number;
    ttsCharactersCount: number;
    sttAudioDuration: number;
}
export declare class UsageCollector {
    #private;
    constructor();
    collect(metrics: AgentMetrics): void;
    get summary(): UsageSummary;
}
//# sourceMappingURL=usage_collector.d.ts.map