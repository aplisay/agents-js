import { AudioFrame } from '@livekit/rtc-node';
/** AudioByteStream translates between LiveKit AudioFrame packets and raw byte data. */
export declare class AudioByteStream {
    #private;
    constructor(sampleRate: number, numChannels: number, samplesPerChannel?: number | null);
    write(data: ArrayBuffer): AudioFrame[];
    flush(): AudioFrame[];
}
//# sourceMappingURL=audio.d.ts.map