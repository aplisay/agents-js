import type { ChatMessage, LLMStream } from '../llm/index.js';
import type { SynthesisHandle } from './agent_output.js';
export declare class SpeechHandle {
    #private;
    constructor(id: string, allowInterruptions: boolean, addToChatCtx: boolean, isReply: boolean, userQuestion: string, fncNestedDepth?: number, extraToolsMessages?: ChatMessage[] | undefined);
    static createAssistantReply(allowInterruptions: boolean, addToChatCtx: boolean, userQuestion: string): SpeechHandle;
    static createAssistantSpeech(allowInterruptions: boolean, addToChatCtx: boolean): SpeechHandle;
    static createToolSpeech(allowInterruptions: boolean, addToChatCtx: boolean, fncNestedDepth: number, extraToolsMessages: ChatMessage[]): SpeechHandle;
    waitForInitialization(): Promise<void>;
    initialize(source: string | LLMStream | AsyncIterable<string>, synthesisHandle: SynthesisHandle): void;
    markUserCommitted(): void;
    markSpeechCommitted(): void;
    get userCommitted(): boolean;
    get speechCommitted(): boolean;
    get id(): string;
    get allowInterruptions(): boolean;
    get addToChatCtx(): boolean;
    get source(): string | LLMStream | AsyncIterable<string>;
    get synthesisHandle(): SynthesisHandle;
    set synthesisHandle(handle: SynthesisHandle);
    get initialized(): boolean;
    get isReply(): boolean;
    get userQuestion(): string;
    get interrupted(): boolean;
    get fncNestedDepth(): number;
    get extraToolsMessages(): ChatMessage[] | undefined;
    addNestedSpeech(handle: SpeechHandle): void;
    get nestedSpeechHandles(): SpeechHandle[];
    nestedSpeechChanged(): Promise<void>;
    get nestedSpeechFinished(): boolean;
    markNestedSpeechFinished(): void;
    join(): Promise<void>;
    setDone(): void;
    interrupt(): void;
    cancel(): void;
}
//# sourceMappingURL=speech_handle.d.ts.map