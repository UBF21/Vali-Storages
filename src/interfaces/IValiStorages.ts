export interface IValiStorages {
    setItem<T>(key: string, value: T): void;
    getItem<T>(key: string, callback: (item: T | null) => void): void;
    removeItem(key: string): void;
    clear(): void;
    getAllKeys(): string[];
}