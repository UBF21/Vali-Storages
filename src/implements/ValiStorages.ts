import { Crypto } from "../crypto/Crypto";
import { AES } from "../enums/AES";
import { TimeUnit } from "../enums/TimeUnit";
import { TimeHelper } from "../helpers/TimeHelper";
import { ICrypto } from "../interfaces/ICrypto";
import { IStoredItem } from "../interfaces/IStoredItem";
import { IValiStorages } from "../interfaces/IValiStorages";
import { ErrorHandler, IValiStoragesConfig } from "../interfaces/IValiStoragesConfig";

export class ValiStorages implements IValiStorages {
    private cryptoInstance: ICrypto;
    private isEncrypt: boolean;
    private timeExpiration?: number;
    private timeUnit?: TimeUnit;
    private slidingExpiration: boolean;
    private initialized: boolean = false;
    private initializationPromise: Promise<void>;
    private storage: Storage;
    private prefix: string;
    private errorHandler: ErrorHandler;
    private onChange?: (key: string, newValue: unknown | null) => void;
    private crossTabListener?: (event: StorageEvent) => void;

    constructor(
        {
            isEncrypt = false,
            keySize = AES.AES_128,
            predefinedKey = "",
            timeExpiration,
            timeUnit,
            useSessionStorage = false,
            prefix = "",
            slidingExpiration = false,
            onError = "throw",
            onChange,
        }: IValiStoragesConfig = {},
        cryptoInstance?: ICrypto
    ) {
        this.storage = ValiStorages.resolveStorage(useSessionStorage);
        this.cryptoInstance = cryptoInstance ?? new Crypto(predefinedKey, keySize);
        this.isEncrypt = isEncrypt;
        this.timeExpiration = timeExpiration;
        this.timeUnit = timeUnit;
        this.slidingExpiration = slidingExpiration;
        this.prefix = prefix;
        this.errorHandler = onError;
        this.onChange = onChange;
        this.initializationPromise = this.initializeCrypto();
        if (onChange) this.setupCrossTabSync();
    }

    // ─── Static helpers ───────────────────────────────────────────────────────

    static isAvailable(useSessionStorage = false): boolean {
        try {
            if (typeof window === "undefined") return false;
            const storage = useSessionStorage ? window.sessionStorage : window.localStorage;
            const testKey = "__vali_check__";
            storage.setItem(testKey, "1");
            storage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    private static resolveStorage(useSessionStorage: boolean): Storage {
        if (typeof window === "undefined") {
            throw new Error(
                "ValiStorages requires a browser environment. " +
                "localStorage/sessionStorage are not available server-side."
            );
        }
        const storage = useSessionStorage ? window.sessionStorage : window.localStorage;
        try {
            const testKey = "__vali_check__";
            storage.setItem(testKey, "1");
            storage.removeItem(testKey);
            return storage;
        } catch {
            throw new Error(
                `${useSessionStorage ? "sessionStorage" : "localStorage"} is not available ` +
                "(e.g., private browsing mode or permissions blocked)."
            );
        }
    }

    // ─── Key helpers ──────────────────────────────────────────────────────────

    private prefixedKey(key: string): string {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }

    private unprefixedKey(rawKey: string): string | null {
        if (!this.prefix) return rawKey;
        const ns = `${this.prefix}:`;
        if (!rawKey.startsWith(ns)) return null;
        return rawKey.slice(ns.length);
    }

    private ownKeys(): string[] {
        const all = Object.keys(this.storage);
        if (!this.prefix) return all;
        const ns = `${this.prefix}:`;
        return all.filter(k => k.startsWith(ns)).map(k => k.slice(ns.length));
    }

    // ─── Initialization ───────────────────────────────────────────────────────

    private async initializeCrypto(): Promise<void> {
        try {
            await this.cryptoInstance.importKey();
            this.initialized = true;
        } catch (error) {
            console.error("Error al inicializar la clave criptográfica:", error);
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initializationPromise;
        }
    }

    // ─── Cross-tab sync ───────────────────────────────────────────────────────

    private setupCrossTabSync(): void {
        if (typeof window === "undefined") return;
        this.crossTabListener = (event: StorageEvent) => {
            if (event.storageArea !== this.storage || event.key === null) return;
            const key = this.unprefixedKey(event.key);
            if (key === null) return;

            if (event.newValue === null) {
                this.onChange!(key, null);
                return;
            }

            try {
                const { value }: IStoredItem = JSON.parse(event.newValue);
                if (!this.isEncrypt) {
                    this.onChange!(key, JSON.parse(value));
                    return;
                }
                this.ensureInitialized().then(() => {
                    this.cryptoInstance
                        .decrypt(value)
                        .then(decrypted => this.onChange!(key, JSON.parse(decrypted)))
                        .catch(() => this.onChange!(key, null));
                });
            } catch {
                this.onChange!(key, null);
            }
        };
        window.addEventListener("storage", this.crossTabListener);
    }

    destroy(): void {
        if (this.crossTabListener) {
            window.removeEventListener("storage", this.crossTabListener);
            this.crossTabListener = undefined;
        }
    }

    // ─── Error handling ───────────────────────────────────────────────────────

    private handleError(error: unknown, operation: string, key?: string): void {
        const err = error instanceof Error ? error : new Error(String(error));
        if (this.errorHandler === "throw") throw err;
        if (this.errorHandler === "silent") return;
        this.errorHandler(err, operation, key);
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    async setItem<T>(key: string, value: T): Promise<void> {
        try {
            await this.ensureInitialized();
            await this.handleSetItem(key, value);
        } catch (error) {
            this.handleError(error, "setItem", key);
        }
    }

    async setItems<T>(items: Record<string, T>): Promise<void> {
        try {
            await this.ensureInitialized();
            await Promise.all(Object.entries(items).map(([k, v]) => this.handleSetItem(k, v)));
        } catch (error) {
            this.handleError(error, "setItems");
        }
    }

    async getItem<T>(key: string): Promise<T | null> {
        try {
            await this.ensureInitialized();
            return await this.handleGetItem<T>(key);
        } catch (error) {
            this.handleError(error, "getItem", key);
            return null;
        }
    }

    async getItems<T>(keys: string[]): Promise<Record<string, T | null>> {
        try {
            await this.ensureInitialized();
            const entries = await Promise.all(
                keys.map(async key => [key, await this.handleGetItem<T>(key)] as const)
            );
            return Object.fromEntries(entries);
        } catch (error) {
            this.handleError(error, "getItems");
            return {};
        }
    }

    async getAll<T = unknown>(): Promise<Record<string, T>> {
        try {
            await this.ensureInitialized();
            const result: Record<string, T> = {};
            await Promise.all(
                this.ownKeys().map(async key => {
                    const value = await this.handleGetItem<T>(key);
                    if (value !== null) result[key] = value;
                })
            );
            return result;
        } catch (error) {
            this.handleError(error, "getAll");
            return {};
        }
    }

    async getOrSet<T>(key: string, factory: () => T | Promise<T>): Promise<T> {
        try {
            await this.ensureInitialized();
            const existing = await this.handleGetItem<T>(key);
            if (existing !== null) return existing;
            const value = await factory();
            await this.handleSetItem(key, value);
            return value;
        } catch (error) {
            this.handleError(error, "getOrSet", key);
            throw error;
        }
    }

    has(key: string): boolean {
        const itemStr = this.storage.getItem(this.prefixedKey(key));
        if (!itemStr) return false;
        const { expiration }: IStoredItem = JSON.parse(itemStr);
        if (expiration && Date.now() > expiration) {
            this.storage.removeItem(this.prefixedKey(key));
            return false;
        }
        return true;
    }

    removeItem(key: string): void {
        this.storage.removeItem(this.prefixedKey(key));
    }

    removeExpired(): void {
        for (const key of this.ownKeys()) {
            const itemStr = this.storage.getItem(this.prefixedKey(key));
            if (!itemStr) continue;
            const { expiration }: IStoredItem = JSON.parse(itemStr);
            if (expiration && Date.now() > expiration) {
                this.storage.removeItem(this.prefixedKey(key));
            }
        }
    }

    updateExpiry(key: string): boolean {
        if (!this.timeExpiration || !this.timeUnit) return false;
        const prefixed = this.prefixedKey(key);
        const itemStr = this.storage.getItem(prefixed);
        if (!itemStr) return false;
        const item: IStoredItem = JSON.parse(itemStr);
        item.expiration = Date.now() + TimeHelper.convertToMilliseconds(this.timeExpiration, this.timeUnit);
        this.safeStorageSet(prefixed, JSON.stringify(item));
        return true;
    }

    clear(): void {
        if (this.prefix) {
            for (const key of this.ownKeys()) {
                this.storage.removeItem(this.prefixedKey(key));
            }
        } else {
            this.storage.clear();
        }
    }

    getAllKeys(): string[] {
        return this.ownKeys();
    }

    size(): number {
        return this.ownKeys().length;
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private safeStorageSet(key: string, value: string): void {
        try {
            this.storage.setItem(key, value);
        } catch (error) {
            if (
                error instanceof DOMException &&
                (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
            ) {
                throw new Error(`Storage quota exceeded. Cannot store item with key "${key}".`);
            }
            throw error;
        }
    }

    private async handleSetItem<T>(key: string, value: T): Promise<void> {
        const expiration =
            this.timeExpiration && this.timeUnit
                ? Date.now() + TimeHelper.convertToMilliseconds(this.timeExpiration, this.timeUnit)
                : undefined;

        const data: IStoredItem = {
            value: this.isEncrypt
                ? await this.cryptoInstance.encrypt(JSON.stringify(value))
                : JSON.stringify(value),
            expiration,
        };

        this.safeStorageSet(this.prefixedKey(key), JSON.stringify(data));
    }

    private async handleGetItem<T>(key: string): Promise<T | null> {
        const itemStr = this.storage.getItem(this.prefixedKey(key));
        if (!itemStr) return null;

        const item: IStoredItem = JSON.parse(itemStr);
        const { value, expiration } = item;

        if (expiration && Date.now() > expiration) {
            this.storage.removeItem(this.prefixedKey(key));
            return null;
        }

        if (this.slidingExpiration && this.timeExpiration && this.timeUnit && expiration !== undefined) {
            item.expiration = Date.now() + TimeHelper.convertToMilliseconds(this.timeExpiration, this.timeUnit);
            this.safeStorageSet(this.prefixedKey(key), JSON.stringify(item));
        }

        const decodedValue = this.isEncrypt
            ? await this.cryptoInstance.decrypt(value)
            : value;

        return JSON.parse(decodedValue) as T;
    }
}
