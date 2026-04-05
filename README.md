# vali-storages

Librería TypeScript para gestionar `localStorage` y `sessionStorage` en el navegador con soporte para **encriptación AES-GCM**, **expiración TTL**, **namespacing**, sincronización **cross-tab** y API completamente tipada.

---

## Instalación

```bash
npm i vali-storages
# o
bun add vali-storages
```

---

## Inicio rápido

```typescript
import { ValiStorages } from 'vali-storages';

const storage = new ValiStorages({
    isEncrypt: true,
    predefinedKey: 'mi-clave-secreta',
    timeExpiration: 2,
    timeUnit: 'hours',
    prefix: 'myapp',
});

await storage.setItem('user', { name: 'Felipe', role: 'admin' });
const user = await storage.getItem<{ name: string; role: string }>('user');
```

---

## Configuración

| Propiedad           | Tipo                                      | Default          | Descripción |
|---------------------|-------------------------------------------|------------------|-------------|
| `predefinedKey`     | `string`                                  | `""`             | Passphrase para derivar la clave AES. |
| `keySize`           | `AES.AES_128 \| AES_192 \| AES_256`       | `AES.AES_128`    | Tamaño de la clave de encriptación. |
| `isEncrypt`         | `boolean`                                 | `false`          | Encripta los valores antes de guardarlos. |
| `timeExpiration`    | `number`                                  | `undefined`      | Tiempo de vida de los items. |
| `timeUnit`          | `TimeUnit`                                | `undefined`      | Unidad del TTL: `SECONDS`, `MINUTES`, `HOURS`, `DAYS`. |
| `useSessionStorage` | `boolean`                                 | `false`          | Usa `sessionStorage` en lugar de `localStorage`. |
| `prefix`            | `string`                                  | `""`             | Namespace para aislar claves entre instancias. |
| `slidingExpiration` | `boolean`                                 | `false`          | Reinicia el TTL en cada lectura exitosa. |
| `onError`           | `'throw' \| 'silent' \| ErrorHandler`    | `'throw'`        | Comportamiento ante errores. |
| `onChange`          | `(key, newValue) => void`                 | `undefined`      | Callback para cambios de otras pestañas (cross-tab). |

---

## API

### Escritura

```typescript
// Guardar un item
await storage.setItem('key', value);

// Guardar múltiples items a la vez
await storage.setItems({ key1: value1, key2: value2 });
```

### Lectura

```typescript
// Leer un item (null si no existe o expiró)
const value = await storage.getItem<MyType>('key');

// Leer múltiples items
const items = await storage.getItems<string>(['key1', 'key2']);
// → { key1: 'a', key2: null }

// Leer todos los items del namespace
const all = await storage.getAll<MyType>();

// Obtener o computar si no existe (cache pattern)
const value = await storage.getOrSet('key', async () => fetchFromAPI());
```

### Verificación y conteo

```typescript
storage.has('key');      // boolean — sin descifrar
storage.size();          // número de items en el namespace
storage.getAllKeys();     // string[] — claves sin prefijo
```

### Eliminación

```typescript
storage.removeItem('key');
storage.removeExpired();  // purga todos los items vencidos
storage.clear();          // elimina solo los del namespace si hay prefix
```

### TTL

```typescript
// Reinicia el TTL de un item existente
storage.updateExpiry('key');  // → boolean
```

### Ciclo de vida

```typescript
// Elimina el listener de cross-tab sync
storage.destroy();

// Verifica si el storage está disponible (modo privado, SSR, etc.)
ValiStorages.isAvailable();           // localStorage
ValiStorages.isAvailable(true);       // sessionStorage
```

---

## Storage tipado

Para un control estricto de tipos en las claves y sus valores:

```typescript
import { createTypedStorage } from 'vali-storages';

interface AppSchema {
    userId: number;
    token: string;
    settings: { theme: 'dark' | 'light' };
}

const storage = createTypedStorage<AppSchema>({
    prefix: 'myapp',
    isEncrypt: true,
    predefinedKey: 'secret',
});

await storage.setItem('userId', 42);          // ✅ OK
await storage.setItem('userId', 'wrong');     // ✅ Error de TypeScript

const token = await storage.getItem('token'); // → string | null
```

---

## Cross-tab sync

Detecta cambios realizados en **otras pestañas** del mismo origen:

```typescript
const storage = new ValiStorages({
    prefix: 'myapp',
    onChange: (key, newValue) => {
        console.log(`Cambio en ${key}:`, newValue); // newValue es null si fue eliminado
    },
});

// Cuando ya no necesites escuchar cambios:
storage.destroy();
```

---

## Manejo de errores

```typescript
// Modo por defecto: lanza el error
const storage = new ValiStorages({ onError: 'throw' });

// Modo silencioso: retorna null en getters, ignora en setters
const storage = new ValiStorages({ onError: 'silent' });

// Función personalizada
const storage = new ValiStorages({
    onError: (error, operation, key) => {
        console.error(`[${operation}] ${key ?? ''}: ${error.message}`);
        Sentry.captureException(error);
    },
});
```

---

## Sliding expiration

El TTL se reinicia automáticamente en cada lectura exitosa:

```typescript
const storage = new ValiStorages({
    timeExpiration: 30,
    timeUnit: 'minutes',
    slidingExpiration: true,  // cada getItem exitoso renueva los 30 min
});
```

---

## Enums

```typescript
import { AES, TimeUnit } from 'vali-storages';

AES.AES_128  // 128 bits (default)
AES.AES_192  // 192 bits
AES.AES_256  // 256 bits

TimeUnit.SECONDS
TimeUnit.MINUTES
TimeUnit.HOURS
TimeUnit.DAYS
```

---

## Compatibilidad SSR / Next.js

La librería detecta automáticamente si está en un entorno sin `window` y lanza un error claro. Para Next.js, crea la instancia dentro de un `useEffect` o en el cliente:

```typescript
// Antes de instanciar, verifica disponibilidad
if (ValiStorages.isAvailable()) {
    const storage = new ValiStorages({ prefix: 'app' });
}
```

---

## Migración desde v1.x

| v1.x | v2.0.0 |
|------|--------|
| `setItem(key, value): void` | `setItem(key, value): Promise<void>` |
| `getItem(key, callback)` | `await getItem(key)` |
| No TTL reiniciable | `updateExpiry(key)` / `slidingExpiration` |
| Sin namespacing | `prefix` en configuración |
| Sin control de errores | `onError: 'throw' \| 'silent' \| fn` |

```typescript
// v1.x
storage.getItem('key', (item) => console.log(item));

// v2.0.0
const item = await storage.getItem('key');
console.log(item);
```

---

## Tests

```bash
bun test               # ejecutar tests
bun run test:watch     # modo watch
bun run test:coverage  # cobertura
```

---

## Licencia

MIT — Felipe Rafael Montenegro Morriberon
