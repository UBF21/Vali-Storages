export interface IValiStorages {
    setItem<T>(key: string, value: T): Promise<void>;
    getItem<T>(key: string): Promise<T | null>;
    getOrSet<T>(key: string, factory: () => T | Promise<T>): Promise<T>;
    has(key: string): boolean;
    removeItem(key: string): void;
    removeExpired(): void;
    updateExpiry(key: string): boolean;
    clear(): void;
    getAllKeys(): string[];
    size(): number;
}