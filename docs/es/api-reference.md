# Referencia de API

## `ValiStorages`

### Constructor

```typescript
new ValiStorages(config?: IValiStoragesConfig, cryptoInstance?: ICrypto)
```

| Parámetro        | Tipo                  | Descripción |
|------------------|-----------------------|-------------|
| `config`         | `IValiStoragesConfig` | Configuración del storage (todos opcionales). |
| `cryptoInstance` | `ICrypto`             | Implementación de crypto personalizada (útil para testing o DI). |

---

### Configuración (`IValiStoragesConfig`)

| Propiedad           | Tipo                              | Default        | Descripción |
|---------------------|-----------------------------------|----------------|-------------|
| `predefinedKey`     | `string`                          | `""`           | Frase de contraseña para derivar la clave AES. |
| `keySize`           | `AES`                             | `AES.AES_128`  | Tamaño de clave AES: `AES_128`, `AES_192` o `AES_256`. |
| `isEncrypt`         | `boolean`                         | `false`        | Encripta los valores antes de almacenarlos. |
| `timeExpiration`    | `number`                          | `undefined`    | Valor de tiempo de vida del item. |
| `timeUnit`          | `TimeUnit`                        | `undefined`    | Unidad para `timeExpiration`: `SECONDS`, `MINUTES`, `HOURS`, `DAYS`. |
| `useSessionStorage` | `boolean`                         | `false`        | Usa `sessionStorage` en lugar de `localStorage`. |
| `prefix`            | `string`                          | `""`           | Prefijo de namespace para aislar claves. |
| `slidingExpiration` | `boolean`                         | `false`        | Reinicia el TTL en cada lectura exitosa. |
| `onError`           | `ErrorHandler`                    | `'throw'`      | Estrategia de error: `'throw'`, `'silent'` o `(err, op, clave) => void`. |
| `onChange`          | `(clave, nuevoValor) => void`     | `undefined`    | Callback para cambios desde otras pestañas del navegador. |

---

### Métodos de instancia

#### `setItem<T>(clave, valor): Promise<void>`

Guarda un valor. Si `isEncrypt` es true, el valor se encripta antes de guardar. Si hay TTL configurado, se adjunta un timestamp de expiración.

```typescript
await storage.setItem('usuario', { nombre: 'Felipe' });
```

---

#### `setItems<T>(items): Promise<void>`

Guarda múltiples pares clave-valor en paralelo.

```typescript
await storage.setItems({ a: 1, b: 2, c: 3 });
```

---

#### `getItem<T>(clave): Promise<T | null>`

Recupera un valor. Retorna `null` si la clave no existe o expiró (y la elimina). Si `slidingExpiration` está activo, reinicia el TTL en cada llamada exitosa.

```typescript
const usuario = await storage.getItem<{ nombre: string }>('usuario');
```

---

#### `getItems<T>(claves): Promise<Record<string, T | null>>`

Recupera múltiples valores en paralelo. Las claves faltantes o expiradas retornan `null`.

```typescript
const items = await storage.getItems<number>(['a', 'b', 'faltante']);
// → { a: 1, b: 2, faltante: null }
```

---

#### `getAll<T>(): Promise<Record<string, T>>`

Retorna todos los items no expirados del namespace actual, desencriptados.

```typescript
const todos = await storage.getAll<unknown>();
```

---

#### `getOrSet<T>(clave, factory): Promise<T>`

Retorna el valor existente si se encuentra. Si no, ejecuta `factory()`, guarda el resultado y lo retorna. Ideal para patrones de caché.

```typescript
const config = await storage.getOrSet('config', async () => {
    return await obtenerConfigDesdeAPI();
});
```

---

#### `has(clave): boolean`

Verifica si una clave existe y no ha expirado. Elimina el item si expiró. **No descifra** el valor.

```typescript
if (storage.has('token')) { /* ... */ }
```

---

#### `removeItem(clave): void`

Elimina un item por clave.

```typescript
storage.removeItem('sesion');
```

---

#### `removeExpired(): void`

Recorre todas las claves del namespace y elimina los items expirados.

```typescript
storage.removeExpired();
```

---

#### `updateExpiry(clave): boolean`

Reinicia el TTL de un item existente al valor configurado en `timeExpiration`. Retorna `false` si la clave no existe o no hay TTL configurado.

```typescript
const actualizado = storage.updateExpiry('sesion'); // → true | false
```

---

#### `clear(): void`

- **Con prefix:** elimina solo las claves del namespace actual.
- **Sin prefix:** limpia todo el storage.

```typescript
storage.clear();
```

---

#### `getAllKeys(): string[]`

Retorna todas las claves del namespace actual, **sin el prefijo**.

```typescript
const claves = storage.getAllKeys(); // → ['usuario', 'token', ...]
```

---

#### `size(): number`

Retorna la cantidad de items en el namespace actual.

```typescript
const cantidad = storage.size(); // → 3
```

---

#### `destroy(): void`

Elimina el listener del evento `storage` configurado por `onChange`. Llámalo cuando la instancia ya no sea necesaria (ej: unmount del componente).

```typescript
storage.destroy();
```

---

### Métodos estáticos

#### `ValiStorages.isAvailable(useSessionStorage?): boolean`

Retorna `true` si `localStorage` (o `sessionStorage`) está accesible en el entorno actual.

```typescript
ValiStorages.isAvailable();       // verifica localStorage
ValiStorages.isAvailable(true);   // verifica sessionStorage
```

---

## `createTypedStorage<Schema>(config?, cryptoInstance?)`

Función factory que retorna un `TypedValiStorages<Schema>` — un wrapper sobre `ValiStorages` con claves y valores completamente tipados.

```typescript
import { createTypedStorage } from 'vali-storages';

interface MiSchema {
    contador: number;
    etiqueta: string;
}

const storage = createTypedStorage<MiSchema>({ prefix: 'app' });
await storage.setItem('contador', 5);     // ✅
await storage.setItem('contador', 'x');   // ❌ Error de TypeScript
```

El objeto retornado expone los mismos métodos que `ValiStorages`, todos tipados al `Schema`.

---

## Enums

### `AES`

```typescript
AES.AES_128  // 16 bytes — 128 bits (default)
AES.AES_192  // 24 bytes — 192 bits
AES.AES_256  // 32 bytes — 256 bits
```

### `TimeUnit`

```typescript
TimeUnit.SECONDS  // segundos
TimeUnit.MINUTES  // minutos
TimeUnit.HOURS    // horas
TimeUnit.DAYS     // días
```

---

## Tipos exportados

### `ErrorHandler`

```typescript
type ErrorHandler =
    | 'throw'
    | 'silent'
    | ((error: Error, operation: string, key?: string) => void);
```

### `ICrypto`

Interfaz para implementaciones de crypto personalizadas (útil para testing):

```typescript
interface ICrypto {
    importKey(): Promise<void>;
    encrypt(data: string): Promise<string>;
    decrypt(data: string): Promise<string>;
}
```
