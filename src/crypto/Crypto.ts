import { AES } from "../enums/AES";

export class Crypto {
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
        const salt = crypto.getRandomValues(new Uint8Array(16)); // Sal aleatoria

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

    // Utilidad para convertir un ArrayBuffer a Base64
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return window.btoa(binary);
    }

    // Utilidad para convertir Base64 a un ArrayBuffer
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = window.atob(base64);
        const len = binary.length;
        const buffer = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            buffer[i] = binary.charCodeAt(i);
        }
        return buffer.buffer;
    }
}