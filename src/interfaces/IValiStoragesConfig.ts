import { AES } from "../enums/AES";
import { TimeUnit } from "../enums/TimeUnit";

export interface IValiStoragesConfig {
    predefinedKey?: string;
    keySize?: AES;
    timeExpiration?: number; 
    timeUnit?: TimeUnit; 
    isEncrypt?: boolean;
    useSessionStorage?:boolean;
}