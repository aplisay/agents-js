import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { LLMMetrics } from '../metrics/base.js';
import { AsyncIterableQueue } from '../utils.js';
import type { ChatContext, ChatRole } from './chat_context.js';
import type { FunctionCallInfo, FunctionContext } from './function_context.js';
export interface ChoiceDelta {
    role: ChatRole;
    content?: string;
    toolCalls?: FunctionCallInfo[];
}
export interface CompletionUsage {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
}
export interface Choice {
    delta: ChoiceDelta;
    index: number;
}
export interface ChatChunk {
    requestId: string;
    choices: Choice[];
    usage?: CompletionUsage;
}
export declare enum LLMEvent {
    METRICS_COLLECTED = 0
}
export type LLMCallbacks = {
    [LLMEvent.METRICS_COLLECTED]: (metrics: LLMMetrics) => void;
};
declare const LLM_base: new () => TypedEmitter<LLMCallbacks>;
export declare abstract class LLM extends LLM_base {
    /**
     * Returns a {@link LLMStream} that can be used to push text and receive LLM responses.
     */
    abstract chat({ chatCtx, fncCtx, temperature, n, parallelToolCalls, }: {
        chatCtx: ChatContext;
        fncCtx?: FunctionContext;
        temperature?: number;
        n?: number;
        parallelToolCalls?: boolean;
    }): LLMStream;
}
export declare abstract class LLMStream implements AsyncIterableIterator<ChatChunk> {
    #private;
    protected output: AsyncIterableQueue<ChatChunk>;
    protected queue: AsyncIterableQueue<ChatChunk>;
    protected closed: boolean;
    protected _functionCalls: FunctionCallInfo[];
    abstract label: string;
    constructor(llm: LLM, chatCtx: ChatContext, fncCtx?: FunctionContext);
    protected monitorMetrics(): Promise<void>;
    /** List of called functions from this stream. */
    get functionCalls(): FunctionCallInfo[];
    /** The function context of this stream. */
    get fncCtx(): FunctionContext | undefined;
    /** The initial chat context of this stream. */
    get chatCtx(): ChatContext;
    /** Execute all deferred functions of this stream concurrently. */
    executeFunctions(): FunctionCallInfo[];
    next(): Promise<IteratorResult<ChatChunk>>;
    close(): void;
    [Symbol.asyncIterator](): LLMStream;
}
export {};
//# sourceMappingURL=llm.d.ts.map