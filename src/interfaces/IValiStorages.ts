export interface IValiStorages {
    setItem<T>(key: string, value: T): Promise<void>;
    getItem<T>(key: string): Promise<T | null>;
    removeItem(key: string): void;
    clear(): void;
    getAllKeys(): string[];
}