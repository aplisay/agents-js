import type { AudioFrame, AudioSource } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { TextAudioSynchronizer } from '../transcription.js';
import { Future } from '../utils.js';
import { SynthesisHandle } from './agent_output.js';
export declare enum AgentPlayoutEvent {
    PLAYOUT_STARTED = 0,
    PLAYOUT_STOPPED = 1
}
export type AgentPlayoutCallbacks = {
    [AgentPlayoutEvent.PLAYOUT_STARTED]: () => void;
    [AgentPlayoutEvent.PLAYOUT_STOPPED]: (interrupt: boolean) => void;
};
export declare class PlayoutHandle {
    #private;
    playoutSource: AsyncIterable<AudioFrame | typeof SynthesisHandle.FLUSH_SENTINEL>;
    totalPlayedTime?: number;
    synchronizer: TextAudioSynchronizer;
    pushedDuration: number;
    intFut: Future;
    doneFut: Future;
    constructor(speechId: string, audioSource: AudioSource, playoutSource: AsyncIterable<AudioFrame | typeof SynthesisHandle.FLUSH_SENTINEL>, synchronizer: TextAudioSynchronizer);
    get speechId(): string;
    get interrupted(): boolean;
    get timePlayed(): number;
    get done(): boolean;
    interrupt(): void;
    join(): Future;
}
declare const AgentPlayout_base: new () => TypedEmitter<AgentPlayoutCallbacks>;
export declare class AgentPlayout extends AgentPlayout_base {
    #private;
    constructor(audioSource: AudioSource);
    get targetVolume(): number;
    set targetVolume(vol: number);
    play(speechId: string, playoutSource: AsyncIterable<AudioFrame | typeof SynthesisHandle.FLUSH_SENTINEL>, synchronizer: TextAudioSynchronizer): PlayoutHandle;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=agent_playout.d.ts.map