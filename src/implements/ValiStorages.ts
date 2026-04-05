import { Crypto } from "../crypto/Crypto";
import { AES } from "../enums/AES";
import { TimeUnit } from "../enums/TimeUnit";
import { TimeHelper } from "../helpers/TimeHelper";
import { IStoredItem } from "../interfaces/IStoredItem";
import { IValiStorages } from "../interfaces/IValiStorages";
import { IValiStoragesConfig } from "../interfaces/IValiStoragesConfig";

export class ValiStorages implements IValiStorages {
    private cryptoInstance: Crypto;
    private isEncrypt: boolean = false;
    private timeExpiration?: number;
    private timeUnit?: TimeUnit;
    private initialized: boolean = false;
    private initializationPromise?: Promise<void>;
    private storage: Storage;


    constructor(
        {
            isEncrypt = false,
            keySize = AES.AES_128,
            predefinedKey = "",
            timeExpiration = undefined,
            timeUnit = undefined,
            useSessionStorage = false
        }: IValiStoragesConfig) {
        this.cryptoInstance = new Crypto(predefinedKey, keySize);
        this.isEncrypt = isEncrypt ? true : false;
        this.timeExpiration = timeExpiration;
        this.timeUnit = timeUnit;
        this.storage = useSessionStorage ? sessionStorage : localStorage;
        this.initializationPromise = this.initializeCrypto();
    }

    private async initializeCrypto(): Promise<void> {
        try {
            await this.cryptoInstance.importKey();
            this.initialized = true;
            console.log('Clave criptográfica importada correctamente.');
        } catch (error) {
            console.error('Error al inicializar la clave criptográfica:', error);
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            console.log('Esperando a que se inicialice la criptografía...');
            await this.initializationPromise!;
            console.log('Criptografía inicializada.');
        }
        return Promise.resolve();
    }

    setItem<T>(key: string, value: T): void {
        this.ensureInitialized()
            .then(() => this.handleSetItem(key, value))
            .catch(err => console.error('Error al cifrar el item:', err));
    }

    getItem<T>(key: string, callback: (item: T | null) => void): void {
        this.ensureInitialized()
            .then(() => this.handleGetItem<T>(key))
            .then(item => callback(item))
            .catch(err => {
                console.error('Error al descifrar el item:', err);
                callback(null);
            });
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
        try {
            const existingItemStr = this.storage.getItem(key);
            let existingItem: IStoredItem | null = null;

            if (existingItemStr) {
                existingItem = JSON.parse(existingItemStr);
            }

            // Calcular la expiración solo si el ítem no existe
            const expiration = this.timeExpiration && this.timeUnit
                ? !existingItem?.expiration ? Date.now() + TimeHelper.convertToMilliseconds(this.timeExpiration, this.timeUnit) : existingItem.expiration
                : undefined;

            const data: IStoredItem = {
                value: this.isEncrypt
                    ? await this.cryptoInstance.encrypt(JSON.stringify(value))
                    : JSON.stringify(value),
                expiration
            };

            this.storage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error al cifrar el item:', error);
            throw error;
        }
    }

    private async handleGetItem<T>(key: string): Promise<T | null> {
        try {

            const itemStr = this.storage.getItem(key);
            if (!itemStr) {
                console.debug(`No se encontró el item con la clave: ${key}`);
                return null;
            }

            const { value, expiration }: IStoredItem = JSON.parse(itemStr);

            console.log(expiration && Date.now() > expiration);
            console.log("Expiration : ", expiration);
            console.log("Date Now : ", Date.now());

            if (expiration && Date.now() > expiration) {
                this.storage.removeItem(key);
                console.debug(`El item con la clave: ${key} ha expirado y ha sido eliminado`);
                return null;
            }

            console.debug(`Valor cifrado recuperado: ${value}`);

            const decodedValue = this.isEncrypt
                ? await this.cryptoInstance.decrypt(value)
                : value;


            console.debug(`Valor descifrado: ${decodedValue}`);

            return JSON.parse(decodedValue) as T;
        } catch (error) {
            console.error('Error al descifrar el item:', error);
            throw error;
        }
    }

}