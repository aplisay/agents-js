import type { Room } from '@livekit/rtc-node';
import { AudioFrame } from '@livekit/rtc-node';
/** Union of a single and a list of {@link AudioFrame}s */
export type AudioBuffer = AudioFrame[] | AudioFrame;
/**
 * Merge one or more {@link AudioFrame}s into a single one.
 *
 * @param buffer Either an {@link AudioFrame} or a list thereof
 * @throws
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
 * | TypeError} if sample rate or channel count are mismatched
 */
export declare const mergeFrames: (buffer: AudioBuffer) => AudioFrame;
export declare const findMicroTrackId: (room: Room, identity: string) => string;
/** @internal */
export declare class Queue<T> {
    #private;
    /** @internal */
    items: T[];
    constructor(limit?: number);
    get(): Promise<T>;
    put(item: T): Promise<void>;
}
/** @internal */
export declare class Future {
    #private;
    constructor();
    get await(): Promise<void>;
    get done(): boolean;
    resolve(): void;
    reject(error: Error): void;
}
/** @internal */
export declare class CancellablePromise<T> {
    #private;
    constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void, onCancel: (cancelFn: () => void) => void) => void);
    get isCancelled(): boolean;
    get error(): Error | null;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | Promise<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | null): Promise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | Promise<TResult>) | null): Promise<T | TResult>;
    finally(onfinally?: (() => void) | null): Promise<T>;
    cancel(): void;
    static from<T>(promise: Promise<T>): CancellablePromise<T>;
}
/** @internal */
export declare function gracefullyCancel<T>(promise: CancellablePromise<T>): Promise<void>;
/** @internal */
export declare class AsyncIterableQueue<T> implements AsyncIterableIterator<T> {
    #private;
    private static readonly CLOSE_SENTINEL;
    get closed(): boolean;
    put(item: T): void;
    close(): void;
    next(): Promise<IteratorResult<T>>;
    [Symbol.asyncIterator](): AsyncIterableQueue<T>;
}
/** @internal */
export declare class ExpFilter {
    #private;
    constructor(alpha: number, max?: number);
    reset(alpha?: number): void;
    apply(exp: number, sample: number): number;
    get filtered(): number | undefined;
    set alpha(alpha: number);
}
/** @internal */
export declare class AudioEnergyFilter {
    #private;
    constructor(cooldownSeconds?: number);
    pushFrame(frame: AudioFrame): boolean;
}
//# sourceMappingURL=utils.d.ts.map