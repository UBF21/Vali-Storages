export interface IStoredItem {
    value: string;        // JSON stringified (plain) or base64 AES-GCM ciphertext
    expiration?: number;  // Unix timestamp in ms; absent means no expiry
    encrypted?: boolean;  // true when value is encrypted ciphertext
}
