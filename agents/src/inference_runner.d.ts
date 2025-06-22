/** @internal */
export declare abstract class InferenceRunner {
    static INFERENCE_METHOD: string;
    static registeredRunners: {
        [id: string]: string;
    };
    static registerRunner(method: string, importPath: string): void;
    abstract initialize(): Promise<void>;
    abstract run(data: unknown): Promise<unknown>;
    abstract close(): Promise<void>;
}
//# sourceMappingURL=inference_runner.d.ts.map