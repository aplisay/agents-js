/// <reference types="node" />
import type { AudioFrame } from '@livekit/rtc-node';
import { type AudioSource } from '@livekit/rtc-node';
import { EventEmitter } from 'node:events';
import type { TextAudioSynchronizer } from '../transcription.js';
import { type AsyncIterableQueue, Future } from '../utils.js';
export declare const proto: {};
export declare class PlayoutHandle extends EventEmitter {
    #private;
    /** @internal */
    synchronizer: TextAudioSynchronizer;
    /** @internal */
    doneFut: Future;
    /** @internal */
    intFut: Future;
    /** @internal */
    pushedDuration: number;
    /** @internal */
    totalPlayedTime: number | undefined;
    constructor(audioSource: AudioSource, sampleRate: number, itemId: string, contentIndex: number, synchronizer: TextAudioSynchronizer);
    get itemId(): string;
    get audioSamples(): number;
    get textChars(): number;
    get contentIndex(): number;
    get interrupted(): boolean;
    get done(): boolean;
    interrupt(): void;
}
export declare class AgentPlayout extends EventEmitter {
    #private;
    constructor(audioSource: AudioSource, sampleRate: number, numChannels: number, inFrameSize: number, outFrameSize: number);
    play(itemId: string, contentIndex: number, synchronizer: TextAudioSynchronizer, textStream: AsyncIterableQueue<string>, audioStream: AsyncIterableQueue<AudioFrame>): PlayoutHandle;
}
//# sourceMappingURL=agent_playout.d.ts.map