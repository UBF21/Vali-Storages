export interface IStoredItem {
    value: string; // Datos cifrados o JSON.stringify(value) si no se cifra
    expiration?: number; // Timestamp de expiración opcional
}