import type { AudioFrame } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { VADMetrics } from './metrics/base.js';
import { AsyncIterableQueue } from './utils.js';
export declare enum VADEventType {
    START_OF_SPEECH = 0,
    INFERENCE_DONE = 1,
    END_OF_SPEECH = 2,
    METRICS_COLLECTED = 3
}
export interface VADEvent {
    /** Type of the VAD event (e.g., start of speech, end of speech, inference done). */
    type: VADEventType;
    /**
     * Index of the audio sample where the event occurred, relative to the inference sample rate.
     */
    samplesIndex: number;
    /** Timestamp when the event was fired. */
    timestamp: number;
    /** Duration of the speech segment. */
    speechDuration: number;
    /** Duration of the silence segment. */
    silenceDuration: number;
    /**
     * List of audio frames associated with the speech.
     *
     * @remarks
     * - For `start_of_speech` events, this contains the audio chunks that triggered the detection.
     * - For `inference_done` events, this contains the audio chunks that were processed.
     * - For `end_of_speech` events, this contains the complete user speech.
     */
    frames: AudioFrame[];
    /** Probability that speech is present (only for `INFERENCE_DONE` events). */
    probability: number;
    /** Time taken to perform the inference, in seconds (only for `INFERENCE_DONE` events). */
    inferenceDuration: number;
    /** Indicates whether speech was detected in the frames. */
    speaking: boolean;
    /** Threshold used to detect silence. */
    rawAccumulatedSilence: number;
    /** Threshold used to detect speech. */
    rawAccumulatedSpeech: number;
}
export interface VADCapabilities {
    updateInterval: number;
}
export type VADCallbacks = {
    [VADEventType.METRICS_COLLECTED]: (metrics: VADMetrics) => void;
};
declare const VAD_base: new () => TypedEmitter<VADCallbacks>;
export declare abstract class VAD extends VAD_base {
    #private;
    abstract label: string;
    constructor(capabilities: VADCapabilities);
    get capabilities(): VADCapabilities;
    /**
     * Returns a {@link VADStream} that can be used to push audio frames and receive VAD events.
     */
    abstract stream(): VADStream;
}
export declare abstract class VADStream implements AsyncIterableIterator<VADEvent> {
    #private;
    protected static readonly FLUSH_SENTINEL: unique symbol;
    protected input: AsyncIterableQueue<AudioFrame | typeof VADStream.FLUSH_SENTINEL>;
    protected queue: AsyncIterableQueue<VADEvent>;
    protected output: AsyncIterableQueue<VADEvent>;
    protected closed: boolean;
    constructor(vad: VAD);
    protected monitorMetrics(): Promise<void>;
    pushFrame(frame: AudioFrame): void;
    flush(): void;
    endInput(): void;
    next(): Promise<IteratorResult<VADEvent>>;
    close(): void;
    [Symbol.asyncIterator](): VADStream;
}
export {};
//# sourceMappingURL=vad.d.ts.map