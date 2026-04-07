import { AES } from "../enums/AES";
import { ICrypto } from "../interfaces/ICrypto";

export class Crypto implements ICrypto {
    private key!: CryptoKey;
    private passphrase: string;
    private keySize: AES;

    constructor(passphrase:string,keySize:AES) {
        this.passphrase = passphrase;
        this.keySize = keySize;
    }

    // Método para importar o derivar la clave predefinida
    async importKey(): Promise<void> {
        // Derivar la clave a partir de la frase de contraseña
        const keyBuffer = await this.deriveKey(this.passphrase);
        this.key = await crypto.subtle.importKey(
            "raw",
            keyBuffer,
            {
                name: "AES-GCM",
            },
            false,
            ["encrypt", "decrypt"]
        );
    }

    // Deriva una clave criptográfica a partir de una frase de contraseña
    private async deriveKey(passphrase: string): Promise<ArrayBuffer> {
        const encoder = new TextEncoder();
        const password = encoder.encode(passphrase);

        // NOTE: The salt is deterministically derived from the passphrase so that
        // the same key can be reproduced across sessions without persisting the salt.
        // This is an intentional trade-off: it weakens PBKDF2's rainbow-table
        // resistance but is acceptable here because the passphrase itself is the
        // shared secret. Use a strong, unique predefinedKey to compensate.
        const passphraseBytes = encoder.encode(passphrase);
        const salt = new Uint8Array(16);
        salt.set(passphraseBytes.slice(0, 14));
        // Los últimos 2 bytes codifican la longitud total de la passphrase
        salt[14] = (passphraseBytes.length >> 8) & 0xff;
        salt[15] = passphraseBytes.length & 0xff;

        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            password,
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        const derivedKey = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256",
            },
            keyMaterial,
            {
                name: "AES-GCM",
                length: this.keySize * 8, // Tamaño en bits
            },
            true,
            ["encrypt", "decrypt"]
        );

        return await crypto.subtle.exportKey("raw", derivedKey);
    }

    // Encripta un mensaje usando AES-GCM
    async encrypt(data: string): Promise<string> {

        const iv = crypto.getRandomValues(new Uint8Array(12)); // Vector de inicialización
        const encodedData = new TextEncoder().encode(data);

        const encryptedData = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            this.key,
            encodedData
        );

        // Concatenar IV y datos cifrados en una sola cadena base64
        return `${this.arrayBufferToBase64(iv)}:${this.arrayBufferToBase64(encryptedData)}`;
    }

    // Desencripta un mensaje cifrado usando AES-GCM
    async decrypt(encryptedData: string): Promise<string> {
        const [ivBase64, dataBase64] = encryptedData.split(':');

        if (!ivBase64 || !dataBase64) {
            throw new Error('Formato de datos cifrados incorrecto.');
        }

        const iv = this.base64ToArrayBuffer(ivBase64);
        const encryptedArrayBuffer = this.base64ToArrayBuffer(dataBase64);

        const decryptedData = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            this.key,
            encryptedArrayBuffer
        );
        return new TextDecoder().decode(decryptedData);
    }

    private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer as ArrayBuffer;
    }
}