import { ICrypto } from "../interfaces/ICrypto";
import { IValiStoragesConfig } from "../interfaces/IValiStoragesConfig";
import { ValiStorages } from "../implements/ValiStorages";

export interface TypedValiStorages<Schema> {
    setItem<K extends keyof Schema & string>(key: K, value: Schema[K]): Promise<void>;
    setItems(items: Partial<Schema>): Promise<void>;
    getItem<K extends keyof Schema & string>(key: K): Promise<Schema[K] | null>;
    getItems<K extends keyof Schema & string>(keys: K[]): Promise<{ [P in K]: Schema[P] | null }>;
    getAll(): Promise<Partial<Schema>>;
    getOrSet<K extends keyof Schema & string>(
        key: K,
        factory: () => Schema[K] | Promise<Schema[K]>
    ): Promise<Schema[K]>;
    has(key: string): boolean;
    removeItem<K extends keyof Schema & string>(key: K): void;
    removeExpired(): void;
    updateExpiry(key: string): boolean;
    clear(): void;
    getAllKeys(): string[];
    size(): number;
    destroy(): void;
}

export function createTypedStorage<Schema>(
    config?: IValiStoragesConfig,
    cryptoInstance?: ICrypto
): TypedValiStorages<Schema> {
    const storage = new ValiStorages(config, cryptoInstance);
    return {
        setItem: <K extends keyof Schema & string>(key: K, value: Schema[K]) =>
            storage.setItem(key, value),
        setItems: (items: Partial<Schema>) =>
            storage.setItems(items as Record<string, unknown>),
        getItem: <K extends keyof Schema & string>(key: K) =>
            storage.getItem<Schema[K]>(key),
        getItems: <K extends keyof Schema & string>(keys: K[]) =>
            storage.getItems<Schema[K]>(keys) as Promise<{ [P in K]: Schema[P] | null }>,
        getAll: () =>
            storage.getAll<unknown>() as Promise<Partial<Schema>>,
        getOrSet: <K extends keyof Schema & string>(
            key: K,
            factory: () => Schema[K] | Promise<Schema[K]>
        ) => storage.getOrSet<Schema[K]>(key, factory),
        has: (key: string) => storage.has(key),
        removeItem: (key: string) => storage.removeItem(key),
        removeExpired: () => storage.removeExpired(),
        updateExpiry: (key: string) => storage.updateExpiry(key),
        clear: () => storage.clear(),
        getAllKeys: () => storage.getAllKeys(),
        size: () => storage.size(),
        destroy: () => storage.destroy(),
    };
}
