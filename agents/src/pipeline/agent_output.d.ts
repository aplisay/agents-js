import type { AudioFrame } from '@livekit/rtc-node';
import type { TextAudioSynchronizer } from '../transcription.js';
import { type TTS } from '../tts/index.js';
import { AsyncIterableQueue, Future } from '../utils.js';
import type { AgentPlayout, PlayoutHandle } from './agent_playout.js';
export type SpeechSource = AsyncIterable<string> | string | Promise<string>;
export declare class SynthesisHandle {
    #private;
    static readonly FLUSH_SENTINEL: unique symbol;
    text?: string;
    ttsSource: SpeechSource;
    tts: TTS;
    queue: AsyncIterableQueue<AudioFrame | typeof SynthesisHandle.FLUSH_SENTINEL>;
    intFut: Future;
    synchronizer: TextAudioSynchronizer;
    constructor(speechId: string, ttsSource: SpeechSource, agentPlayout: AgentPlayout, tts: TTS, synchronizer: TextAudioSynchronizer);
    get speechId(): string;
    get validated(): boolean;
    get interrupted(): boolean;
    get playHandle(): PlayoutHandle | undefined;
    /** Validate the speech for playout. */
    play(): PlayoutHandle;
    /** Interrupt the speech. */
    interrupt(): void;
}
export declare class AgentOutput {
    #private;
    constructor(agentPlayout: AgentPlayout, tts: TTS);
    get playout(): AgentPlayout;
    close(): Promise<void>;
    synthesize(speechId: string, ttsSource: SpeechSource, synchronizer: TextAudioSynchronizer): SynthesisHandle;
}
//# sourceMappingURL=agent_output.d.ts.map