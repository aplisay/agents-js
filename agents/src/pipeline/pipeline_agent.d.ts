import type { NoiseCancellationOptions, RemoteParticipant, Room } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { CallableFunctionResult, FunctionCallInfo, FunctionContext, LLM } from '../llm/index.js';
import { LLMStream } from '../llm/index.js';
import { ChatContext, ChatMessage } from '../llm/index.js';
import type { AgentMetrics } from '../metrics/base.js';
import { type STT } from '../stt/index.js';
import type { SentenceTokenizer, WordTokenizer } from '../tokenize/tokenizer.js';
import type { TTS } from '../tts/index.js';
import { type VAD } from '../vad.js';
import type { SpeechSource } from './agent_output.js';
import { SpeechHandle } from './speech_handle.js';
export type AgentState = 'initializing' | 'thinking' | 'listening' | 'speaking';
export declare const AGENT_STATE_ATTRIBUTE = "lk.agent.state";
export type BeforeLLMCallback = (agent: VoicePipelineAgent, chatCtx: ChatContext) => LLMStream | false | void | Promise<LLMStream | false | void>;
export type BeforeTTSCallback = (agent: VoicePipelineAgent, source: string | AsyncIterable<string>) => SpeechSource;
export declare enum VPAEvent {
    USER_STARTED_SPEAKING = 0,
    USER_STOPPED_SPEAKING = 1,
    AGENT_STARTED_SPEAKING = 2,
    AGENT_STOPPED_SPEAKING = 3,
    USER_SPEECH_COMMITTED = 4,
    AGENT_SPEECH_COMMITTED = 5,
    AGENT_SPEECH_INTERRUPTED = 6,
    FUNCTION_CALLS_COLLECTED = 7,
    FUNCTION_CALLS_FINISHED = 8,
    METRICS_COLLECTED = 9
}
export type VPACallbacks = {
    [VPAEvent.USER_STARTED_SPEAKING]: () => void;
    [VPAEvent.USER_STOPPED_SPEAKING]: () => void;
    [VPAEvent.AGENT_STARTED_SPEAKING]: () => void;
    [VPAEvent.AGENT_STOPPED_SPEAKING]: () => void;
    [VPAEvent.USER_SPEECH_COMMITTED]: (msg: ChatMessage) => void;
    [VPAEvent.AGENT_SPEECH_COMMITTED]: (msg: ChatMessage) => void;
    [VPAEvent.AGENT_SPEECH_INTERRUPTED]: (msg: ChatMessage) => void;
    [VPAEvent.FUNCTION_CALLS_COLLECTED]: (funcs: FunctionCallInfo[]) => void;
    [VPAEvent.FUNCTION_CALLS_FINISHED]: (funcs: CallableFunctionResult[]) => void;
    [VPAEvent.METRICS_COLLECTED]: (metrics: AgentMetrics) => void;
};
interface TurnDetector {
    unlikelyThreshold: number;
    supportsLanguage: (language?: string) => boolean;
    predictEndOfTurn: (chatCtx: ChatContext) => Promise<number>;
}
export declare class AgentCallContext {
    #private;
    constructor(agent: VoicePipelineAgent, llmStream: LLMStream);
    static getCurrent(): AgentCallContext;
    get agent(): VoicePipelineAgent;
    storeMetadata(key: string, value: any): void;
    getMetadata(key: string, orDefault?: any): any;
    get llmStream(): LLMStream;
    get extraChatMessages(): ChatMessage[];
    addExtraChatMessage(message: ChatMessage): void;
}
export interface AgentTranscriptionOptions {
    /** Whether to forward the user transcription to the client */
    userTranscription: boolean;
    /** Whether to forward the agent transcription to the client */
    agentTranscription: boolean;
    /**
     * The speed at which the agent's speech transcription is forwarded to the client.
     * We try to mimic the agent's speech speed by adjusting the transcription speed.
     */
    agentTranscriptionSpeech: number;
    /**
     * The tokenizer used to split the speech into sentences.
     * This is used to decide when to mark a transcript as final for the agent transcription.
     */
    sentenceTokenizer: SentenceTokenizer;
    /**
     * The tokenizer used to split the speech into words.
     * This is used to simulate the "interim results" of the agent transcription.
     */
    wordTokenizer: WordTokenizer;
    /**
     * A function that takes a string (word) as input and returns a list of strings,
     * representing the hyphenated parts of the word.
     */
    hyphenateWord: (word: string) => string[];
}
export interface VPAOptions {
    /** Chat context for the assistant. */
    chatCtx?: ChatContext;
    /** Function context for the assistant. */
    fncCtx?: FunctionContext;
    /** Whether to allow the user to interrupt the assistant. */
    allowInterruptions: boolean;
    /** Minimum duration of speech to consider for interruption. */
    interruptSpeechDuration: number;
    /** Minimum number of words to consider for interuption. This may increase latency. */
    interruptMinWords: number;
    /** Delay to wait before considering the user speech done. */
    minEndpointingDelay: number;
    maxNestedFncCalls: number;
    preemptiveSynthesis: boolean;
    beforeLLMCallback: BeforeLLMCallback;
    beforeTTSCallback: BeforeTTSCallback;
    /** Options for assistant transcription. */
    transcription: AgentTranscriptionOptions;
    /** Turn detection model to use. */
    turnDetector?: TurnDetector;
    /** Noise cancellation options. */
    noiseCancellation?: NoiseCancellationOptions;
}
declare const VoicePipelineAgent_base: new () => TypedEmitter<VPACallbacks>;
/** A pipeline agent (VAD + STT + LLM + TTS) implementation. */
export declare class VoicePipelineAgent extends VoicePipelineAgent_base {
    #private;
    /** Minimum time played for the user speech to be committed to the chat context. */
    readonly MIN_TIME_PLAYED_FOR_COMMIT = 1.5;
    protected static readonly FLUSH_SENTINEL: unique symbol;
    transcribedText: string;
    constructor(
    /** Voice Activity Detection instance. */
    vad: VAD, 
    /** Speech-to-Text instance. */
    stt: STT, 
    /** Large Language Model instance. */
    llm: LLM, 
    /** Text-to-Speech instance. */
    tts: TTS, 
    /** Additional VoicePipelineAgent options. */
    opts?: Partial<VPAOptions>);
    get fncCtx(): FunctionContext | undefined;
    set fncCtx(ctx: FunctionContext);
    get chatCtx(): ChatContext;
    get llm(): LLM;
    get tts(): TTS;
    get stt(): STT;
    get vad(): VAD;
    /** Start the voice assistant. */
    start(
    /** The room to connect to. */
    room: Room, 
    /**
     * The participant to listen to.
     *
     * @remarks
     * Can be a participant or an identity.
     * If omitted, the first participant in the room will be selected.
     */
    participant?: RemoteParticipant | string | null): void;
    /** Play a speech source through the voice assistant. */
    say(source: string | LLMStream | AsyncIterable<string>, allowInterruptions?: boolean, addToChatCtx?: boolean): Promise<SpeechHandle>;
    /** Close the voice assistant. */
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=pipeline_agent.d.ts.map