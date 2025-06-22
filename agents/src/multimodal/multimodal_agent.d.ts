/// <reference types="node" />
import type { NoiseCancellationOptions, RemoteAudioTrack, RemoteParticipant, Room } from '@livekit/rtc-node';
import { EventEmitter } from 'node:events';
import * as llm from '../llm/index.js';
/**
 * @internal
 * @beta
 */
export declare abstract class RealtimeSession extends EventEmitter {
    abstract conversation: any;
    abstract inputAudioBuffer: any;
    abstract fncCtx: llm.FunctionContext | undefined;
    abstract recoverFromTextResponse(itemId: string): void;
}
/**
 * @internal
 * @beta
 */
export declare abstract class RealtimeModel {
    abstract session(options: any): RealtimeSession;
    abstract close(): Promise<void>;
    abstract sampleRate: number;
    abstract numChannels: number;
    abstract inFrameSize: number;
    abstract outFrameSize: number;
}
export type AgentState = 'initializing' | 'thinking' | 'listening' | 'speaking';
export declare const AGENT_STATE_ATTRIBUTE = "lk.agent.state";
/** @beta */
export declare class MultimodalAgent extends EventEmitter {
    #private;
    model: RealtimeModel;
    room: Room | null;
    linkedParticipant: RemoteParticipant | null;
    subscribedTrack: RemoteAudioTrack | null;
    readMicroTask: Promise<void> | null;
    constructor({ model, chatCtx, fncCtx, maxTextResponseRetries, noiseCancellation, }: {
        model: RealtimeModel;
        chatCtx?: llm.ChatContext;
        fncCtx?: llm.FunctionContext;
        maxTextResponseRetries?: number;
        noiseCancellation?: NoiseCancellationOptions;
    });
    get fncCtx(): llm.FunctionContext | undefined;
    set fncCtx(ctx: llm.FunctionContext | undefined);
    start(room: Room, participant?: RemoteParticipant | string | null): Promise<RealtimeSession>;
}
//# sourceMappingURL=multimodal_agent.d.ts.map