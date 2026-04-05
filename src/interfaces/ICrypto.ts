export interface ICrypto {
    importKey(): Promise<void>;
    encrypt(data: string): Promise<string>;
    decrypt(data: string): Promise<string>;
}
