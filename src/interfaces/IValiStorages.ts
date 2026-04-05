export interface IValiStorages {
    setItem<T>(key: string, value: T): Promise<void>;
    setItems<T>(items: Record<string, T>): Promise<void>;
    getItem<T>(key: string): Promise<T | null>;
    getItems<T>(keys: string[]): Promise<Record<string, T | null>>;
    getAll<T = unknown>(): Promise<Record<string, T>>;
    getOrSet<T>(key: string, factory: () => T | Promise<T>): Promise<T>;
    has(key: string): boolean;
    removeItem(key: string): void;
    removeExpired(): void;
    updateExpiry(key: string): boolean;
    clear(): void;
    getAllKeys(): string[];
    size(): number;
    destroy(): void;
}
