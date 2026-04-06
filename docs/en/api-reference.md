# API Reference

## `ValiStorages`

### Constructor

```typescript
new ValiStorages(config?: IValiStoragesConfig, cryptoInstance?: ICrypto)
```

| Parameter        | Type               | Description |
|------------------|--------------------|-------------|
| `config`         | `IValiStoragesConfig` | Storage configuration (all optional). |
| `cryptoInstance` | `ICrypto`          | Custom crypto implementation for testing or DI. |

---

### Configuration (`IValiStoragesConfig`)

| Property            | Type                              | Default        | Description |
|---------------------|-----------------------------------|----------------|-------------|
| `predefinedKey`     | `string`                          | `""`           | Passphrase used to derive the AES key. |
| `keySize`           | `AES`                             | `AES.AES_128`  | AES key size: `AES_128`, `AES_192`, or `AES_256`. |
| `isEncrypt`         | `boolean`                         | `false`        | Encrypt values before storing. |
| `timeExpiration`    | `number`                          | `undefined`    | Item lifetime value. |
| `timeUnit`          | `TimeUnit`                        | `undefined`    | Unit for `timeExpiration`: `SECONDS`, `MINUTES`, `HOURS`, `DAYS`. |
| `useSessionStorage` | `boolean`                         | `false`        | Use `sessionStorage` instead of `localStorage`. |
| `prefix`            | `string`                          | `""`           | Namespace prefix to isolate keys. |
| `slidingExpiration` | `boolean`                         | `false`        | Reset TTL on every successful read. |
| `onError`           | `ErrorHandler`                    | `'throw'`      | Error strategy: `'throw'`, `'silent'`, or `(err, op, key) => void`. |
| `onChange`          | `(key, newValue) => void`         | `undefined`    | Callback fired when another tab modifies a key in this namespace. |

---

### Instance Methods

#### `setItem<T>(key, value): Promise<void>`

Stores a value. If `isEncrypt` is true, the value is encrypted before saving. If TTL is configured, an expiration timestamp is attached.

```typescript
await storage.setItem('user', { name: 'Felipe' });
```

---

#### `setItems<T>(items): Promise<void>`

Stores multiple key-value pairs in parallel.

```typescript
await storage.setItems({ a: 1, b: 2, c: 3 });
```

---

#### `getItem<T>(key): Promise<T | null>`

Retrieves a value. Returns `null` if the key doesn't exist or has expired (and removes it). If `slidingExpiration` is enabled, resets TTL on each successful call.

```typescript
const user = await storage.getItem<{ name: string }>('user');
```

---

#### `getItems<T>(keys): Promise<Record<string, T | null>>`

Retrieves multiple values in parallel. Missing or expired keys return `null`.

```typescript
const items = await storage.getItems<number>(['a', 'b', 'missing']);
// → { a: 1, b: 2, missing: null }
```

---

#### `getAll<T>(): Promise<Record<string, T>>`

Returns all non-expired items in the current namespace, decrypted.

```typescript
const all = await storage.getAll<unknown>();
```

---

#### `getOrSet<T>(key, factory): Promise<T>`

Returns the existing value if found. Otherwise, calls `factory()`, stores the result, and returns it. Useful for caching.

```typescript
const data = await storage.getOrSet('config', async () => {
    return await fetchConfigFromAPI();
});
```

---

#### `has(key): boolean`

Checks if a key exists and has not expired. Removes the item if expired. Does **not** decrypt the value.

```typescript
if (storage.has('token')) { /* ... */ }
```

---

#### `removeItem(key): void`

Deletes a single item by key.

```typescript
storage.removeItem('session');
```

---

#### `removeExpired(): void`

Scans all keys in the namespace and removes expired items.

```typescript
storage.removeExpired();
```

---

#### `updateExpiry(key): boolean`

Resets the TTL of an existing item to the configured `timeExpiration`. Returns `false` if the key doesn't exist or no TTL is configured.

```typescript
const updated = storage.updateExpiry('session'); // → true | false
```

---

#### `clear(): void`

- **With prefix:** removes only the keys belonging to this namespace.
- **Without prefix:** clears the entire storage.

```typescript
storage.clear();
```

---

#### `getAllKeys(): string[]`

Returns all keys in the current namespace, **without the prefix**.

```typescript
const keys = storage.getAllKeys(); // → ['user', 'token', ...]
```

---

#### `size(): number`

Returns the number of items in the current namespace.

```typescript
const count = storage.size(); // → 3
```

---

#### `destroy(): void`

Removes the `storage` event listener set up by `onChange`. Call this when the storage instance is no longer needed (e.g., component unmount).

```typescript
storage.destroy();
```

---

### Static Methods

#### `ValiStorages.isAvailable(useSessionStorage?): boolean`

Returns `true` if `localStorage` (or `sessionStorage`) is accessible in the current environment.

```typescript
ValiStorages.isAvailable();       // checks localStorage
ValiStorages.isAvailable(true);   // checks sessionStorage
```

---

## `createTypedStorage<Schema>(config?, cryptoInstance?)`

Factory function that returns a `TypedValiStorages<Schema>` — a wrapper over `ValiStorages` with type-safe keys and values.

```typescript
import { createTypedStorage } from 'vali-storages';

interface MySchema {
    count: number;
    label: string;
}

const storage = createTypedStorage<MySchema>({ prefix: 'app' });
await storage.setItem('count', 5);     // ✅
await storage.setItem('count', 'x');   // ❌ TypeScript error
```

The returned object exposes the same methods as `ValiStorages`, all strongly typed to `Schema`.

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
TimeUnit.SECONDS
TimeUnit.MINUTES
TimeUnit.HOURS
TimeUnit.DAYS
```

---

## Types

### `ErrorHandler`

```typescript
type ErrorHandler =
    | 'throw'
    | 'silent'
    | ((error: Error, operation: string, key?: string) => void);
```

### `ICrypto`

Interface for custom crypto implementations (useful for testing):

```typescript
interface ICrypto {
    importKey(): Promise<void>;
    encrypt(data: string): Promise<string>;
    decrypt(data: string): Promise<string>;
}
```
