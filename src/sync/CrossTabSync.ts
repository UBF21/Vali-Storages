import { ICrypto } from "../interfaces/ICrypto";
import { IStoredItem } from "../interfaces/IStoredItem";

export interface CrossTabSyncOptions {
    storage: Storage;
    prefix: string;
    onChange: (key: string, newValue: unknown) => void;
    cryptoInstance: ICrypto | null;
    ensureInitialized: () => Promise<void>;
}

export class CrossTabSync {
    private readonly listener: (event: StorageEvent) => void;

    constructor(private readonly options: CrossTabSyncOptions) {
        this.listener = this.buildListener();
        window.addEventListener("storage", this.listener);
    }

    destroy(): void {
        window.removeEventListener("storage", this.listener);
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private unprefixedKey(rawKey: string): string | null {
        const { prefix } = this.options;
        if (!prefix) return rawKey;
        const ns = `${prefix}:`;
        if (!rawKey.startsWith(ns)) return null;
        return rawKey.slice(ns.length);
    }

    private buildListener(): (event: StorageEvent) => void {
        return (event: StorageEvent) => {
            const { storage, onChange, cryptoInstance, ensureInitialized } = this.options;

            if (event.storageArea !== storage || event.key === null) return;
            const key = this.unprefixedKey(event.key);
            if (key === null) return;

            if (event.newValue === null) {
                onChange(key, null);
                return;
            }

            try {
                const item: IStoredItem = JSON.parse(event.newValue);
                if (!item.encrypted) {
                    onChange(key, JSON.parse(item.value));
                    return;
                }
                if (!cryptoInstance) {
                    onChange(key, null);
                    return;
                }
                ensureInitialized().then(() => {
                    cryptoInstance
                        .decrypt(item.value)
                        .then(decrypted => onChange(key, JSON.parse(decrypted)))
                        .catch(() => onChange(key, null));
                });
            } catch {
                onChange(key, null);
            }
        };
    }
}
