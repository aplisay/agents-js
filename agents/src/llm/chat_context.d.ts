import type { AudioFrame, VideoFrame } from '@livekit/rtc-node';
import type { CallableFunctionResult, FunctionCallInfo } from './function_context.js';
export declare enum ChatRole {
    SYSTEM = 0,
    USER = 1,
    ASSISTANT = 2,
    TOOL = 3
}
export interface ChatImage {
    image: string | VideoFrame;
    inferenceWidth?: number;
    inferenceHeight?: number;
    /**
     * @internal
     * Used by LLM implementations to store a processed version of the image for later use.
     */
    cache: {
        [id: string | number | symbol]: any;
    };
}
export interface ChatAudio {
    frame: AudioFrame | AudioFrame[];
}
export type ChatContent = string | ChatImage | ChatAudio;
export declare class ChatMessage {
    readonly role: ChatRole;
    readonly id?: string;
    readonly name?: string;
    readonly content?: ChatContent | ChatContent[];
    readonly toolCalls?: FunctionCallInfo[];
    readonly toolCallId?: string;
    readonly toolException?: Error;
    /** @internal */
    constructor({ role, id, name, content, toolCalls, toolCallId, toolException, }: {
        role: ChatRole;
        id?: string;
        name?: string;
        content?: ChatContent | ChatContent[];
        toolCalls?: FunctionCallInfo[];
        toolCallId?: string;
        toolException?: Error;
    });
    static createToolFromFunctionResult(func: CallableFunctionResult): ChatMessage;
    static createToolCalls(toolCalls: FunctionCallInfo[], text?: string): ChatMessage;
    static create(options: Partial<{
        text?: string;
        images: ChatImage[];
        role: ChatRole;
    }>): ChatMessage;
    /** Returns a structured clone of this message. */
    copy(): ChatMessage;
}
export declare class ChatContext {
    messages: ChatMessage[];
    metadata: {
        [id: string]: any;
    };
    append(msg: {
        text?: string;
        images?: ChatImage[];
        role: ChatRole;
    }): ChatContext;
    /** Returns a structured clone of this context. */
    copy(): ChatContext;
}
//# sourceMappingURL=chat_context.d.ts.map