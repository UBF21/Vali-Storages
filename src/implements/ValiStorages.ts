import { Crypto } from "../crypto/Crypto";
import { AES } from "../enums/AES";
import { TimeUnit } from "../enums/TimeUnit";
import { TimeHelper } from "../helpers/TimeHelper";
import { ICrypto } from "../interfaces/ICrypto";
import { IStoredItem } from "../interfaces/IStoredItem";
import { IValiStorages } from "../interfaces/IValiStorages";
import { IValiStoragesConfig } from "../interfaces/IValiStoragesConfig";

export class ValiStorages implements IValiStorages {
    private cryptoInstance: ICrypto;
    private isEncrypt: boolean;
    private timeExpiration?: number;
    private timeUnit?: TimeUnit;
    private initialized: boolean = false;
    private initializationPromise: Promise<void>;
    private storage: Storage;

    constructor(
        {
            isEncrypt = false,
            keySize = AES.AES_128,
            predefinedKey = "",
            timeExpiration = undefined,
            timeUnit = undefined,
            useSessionStorage = false
        }: IValiStoragesConfig,
        cryptoInstance?: ICrypto
    ) {
        this.cryptoInstance = cryptoInstance ?? new Crypto(predefinedKey, keySize);
        this.isEncrypt = isEncrypt;
        this.timeExpiration = timeExpiration;
        this.timeUnit = timeUnit;
        this.storage = useSessionStorage ? sessionStorage : localStorage;
        this.initializationPromise = this.initializeCrypto();
    }

    private async initializeCrypto(): Promise<void> {
        try {
            await this.cryptoInstance.importKey();
            this.initialized = true;
        } catch (error) {
            console.error('Error al inicializar la clave criptográfica:', error);
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initializationPromise;
        }
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        await this.ensureInitialized();
        await this.handleSetItem(key, value);
    }

    async getItem<T>(key: string): Promise<T | null> {
        await this.ensureInitialized();
        return this.handleGetItem<T>(key);
    }

    removeItem(key: string): void {
        this.storage.removeItem(key);
    }

    clear(): void {
        this.storage.clear();
    }

    getAllKeys(): string[] {
        return Object.keys(this.storage);
    }

    private async handleSetItem<T>(key: string, value: T): Promise<void> {
        const expiration = this.timeExpiration && this.timeUnit
            ? Date.now() + TimeHelper.convertToMilliseconds(this.timeExpiration, this.timeUnit)
            : undefined;

        const data: IStoredItem = {
            value: this.isEncrypt
                ? await this.cryptoInstance.encrypt(JSON.stringify(value))
                : JSON.stringify(value),
            expiration
        };

        this.storage.setItem(key, JSON.stringify(data));
    }

    private async handleGetItem<T>(key: string): Promise<T | null> {
        const itemStr = this.storage.getItem(key);
        if (!itemStr) return null;

        const { value, expiration }: IStoredItem = JSON.parse(itemStr);

        if (expiration && Date.now() > expiration) {
            this.storage.removeItem(key);
            return null;
        }

        const decodedValue = this.isEncrypt
            ? await this.cryptoInstance.decrypt(value)
            : value;

        return JSON.parse(decodedValue) as T;
    }
}
