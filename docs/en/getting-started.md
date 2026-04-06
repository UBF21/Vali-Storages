# Getting Started

## Installation

```bash
npm install vali-storages
# or
bun add vali-storages
```

---

## Basic Usage

```typescript
import { ValiStorages } from 'vali-storages';

const storage = new ValiStorages();

await storage.setItem('username', 'felipe');
const username = await storage.getItem<string>('username');
// → 'felipe'
```

---

## With Encryption

Encrypt all stored values using AES-GCM via the Web Crypto API:

```typescript
import { ValiStorages, AES } from 'vali-storages';

const storage = new ValiStorages({
    isEncrypt: true,
    predefinedKey: 'my-secret-passphrase',
    keySize: AES.AES_256,
});

await storage.setItem('token', 'super-secret-jwt');
const token = await storage.getItem<string>('token');
// → 'super-secret-jwt' (decrypted automatically)
```

> **Note:** Use the same `predefinedKey` every time you instantiate the class. The key derivation is deterministic — the same passphrase always produces the same encryption key.

---

## With TTL Expiration

Items automatically expire and are removed on the next read:

```typescript
import { ValiStorages, TimeUnit } from 'vali-storages';

const storage = new ValiStorages({
    timeExpiration: 30,
    timeUnit: TimeUnit.MINUTES,
});

await storage.setItem('session', { userId: 42 });

// 30 minutes later...
const session = await storage.getItem('session');
// → null (expired and removed)
```

---

## With Namespace (prefix)

Isolate keys between different parts of your application to avoid collisions:

```typescript
const authStorage = new ValiStorages({ prefix: 'auth' });
const cartStorage = new ValiStorages({ prefix: 'cart' });

await authStorage.setItem('token', 'abc');
await cartStorage.setItem('token', 'xyz');

// They don't interfere with each other
await authStorage.getItem('token'); // → 'abc'
await cartStorage.getItem('token'); // → 'xyz'

// getAllKeys / clear / size only affect their own namespace
authStorage.size(); // → 1
cartStorage.clear(); // removes only cart keys
```

---

## Sliding Expiration

Automatically reset TTL on every successful read (keeps active sessions alive):

```typescript
const storage = new ValiStorages({
    timeExpiration: 30,
    timeUnit: TimeUnit.MINUTES,
    slidingExpiration: true,
});

await storage.setItem('session', data);

// User reads the session — TTL resets to 30 more minutes from now
await storage.getItem('session');
```

---

## Cross-Tab Sync

React to changes made in other browser tabs:

```typescript
const storage = new ValiStorages({
    prefix: 'myapp',
    onChange: (key, newValue) => {
        if (key === 'theme') applyTheme(newValue as string);
        if (newValue === null) console.log(`${key} was deleted`);
    },
});

// Clean up when no longer needed (e.g., on component unmount)
storage.destroy();
```

---

## Error Handling

```typescript
// Default: throws on error
const storage = new ValiStorages({ onError: 'throw' });

// Silent: returns null for getters, ignores setter errors
const storage = new ValiStorages({ onError: 'silent' });

// Custom handler (e.g., log to Sentry)
const storage = new ValiStorages({
    onError: (error, operation, key) => {
        Sentry.captureException(error, { extra: { operation, key } });
    },
});
```

---

## Type-Safe Storage

Use `createTypedStorage<Schema>()` for compile-time type checking of keys and values:

```typescript
import { createTypedStorage } from 'vali-storages';

interface AppSchema {
    userId: number;
    token: string;
    settings: { theme: 'dark' | 'light'; language: string };
}

const storage = createTypedStorage<AppSchema>({
    prefix: 'myapp',
    isEncrypt: true,
    predefinedKey: 'secret',
});

await storage.setItem('userId', 42);             // ✅ OK
await storage.setItem('userId', 'hello');        // ❌ Type error
await storage.setItem('unknown', 'value');       // ❌ Key not in schema

const id = await storage.getItem('userId');      // → number | null
const settings = await storage.getItem('settings'); // → { theme, language } | null
```

---

## SSR / Next.js Compatibility

`ValiStorages` requires a browser environment. In SSR frameworks, guard the instantiation:

```typescript
// Check before instantiating
if (ValiStorages.isAvailable()) {
    const storage = new ValiStorages({ prefix: 'app' });
}

// Or in Next.js / React, use useEffect
useEffect(() => {
    const storage = new ValiStorages({ prefix: 'app' });
    // use storage here
}, []);
```

---

## Next Steps

- [API Reference](api-reference.md) — complete method documentation
- [Migration from v1.x](migration.md) — upgrade guide
