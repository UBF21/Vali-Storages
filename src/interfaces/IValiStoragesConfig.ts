import { AES } from "../enums/AES";
import { TimeUnit } from "../enums/TimeUnit";

export type ErrorHandler =
    | 'throw'
    | 'silent'
    | ((error: Error, operation: string, key?: string) => void);

export interface IValiStoragesConfig {
    predefinedKey?: string;
    keySize?: AES;
    timeExpiration?: number;
    timeUnit?: TimeUnit;
    isEncrypt?: boolean;
    useSessionStorage?: boolean;
    prefix?: string;
    slidingExpiration?: boolean;
    onError?: ErrorHandler;
    onChange?: (key: string, newValue: unknown | null) => void;
}
