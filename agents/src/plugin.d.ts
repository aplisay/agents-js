export declare abstract class Plugin {
    #private;
    registeredPlugins: Plugin[];
    constructor(title: string, version: string);
    static registerPlugins(plugin: Plugin): void;
    abstract downloadFiles(): void;
    get title(): string;
    get version(): string;
}
//# sourceMappingURL=plugin.d.ts.map