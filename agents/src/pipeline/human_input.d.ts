import type { NoiseCancellationOptions, RemoteAudioTrack, RemoteParticipant, Room } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { STT, SpeechEvent } from '../stt/stt.js';
import type { VAD, VADEvent } from '../vad.js';
export declare enum HumanInputEvent {
    START_OF_SPEECH = 0,
    VAD_INFERENCE_DONE = 1,
    END_OF_SPEECH = 2,
    FINAL_TRANSCRIPT = 3,
    INTERIM_TRANSCRIPT = 4
}
export type HumanInputCallbacks = {
    [HumanInputEvent.START_OF_SPEECH]: (event: VADEvent) => void;
    [HumanInputEvent.VAD_INFERENCE_DONE]: (event: VADEvent) => void;
    [HumanInputEvent.END_OF_SPEECH]: (event: VADEvent) => void;
    [HumanInputEvent.FINAL_TRANSCRIPT]: (event: SpeechEvent) => void;
    [HumanInputEvent.INTERIM_TRANSCRIPT]: (event: SpeechEvent) => void;
};
declare const HumanInput_base: new () => TypedEmitter<HumanInputCallbacks>;
export declare class HumanInput extends HumanInput_base {
    #private;
    constructor(room: Room, vad: VAD, stt: STT, participant: RemoteParticipant, noiseCancellation?: NoiseCancellationOptions);
    get participant(): RemoteParticipant;
    get subscribedTrack(): RemoteAudioTrack | undefined;
    get speaking(): boolean;
    get speakingProbability(): number;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=human_input.d.ts.map