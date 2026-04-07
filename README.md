# vali-storages

TypeScript library for browser storage management with **AES-GCM encryption**, **TTL expiration**, **namespacing**, **cross-tab sync**, and a fully typed API.

[![npm version](https://img.shields.io/npm/v/vali-storages)](https://www.npmjs.com/package/vali-storages)
[![license](https://img.shields.io/npm/l/vali-storages)](LICENSE)
[![docs](https://img.shields.io/badge/docs-vali--storages-2563EB)](https://vali-storages-docs.netlify.app/)

> 📖 **Documentation:** [vali-storages-docs.netlify.app](https://vali-storages-docs.netlify.app/) · [English](https://vali-storages-docs.netlify.app/docs/getting-started) · [Español](https://vali-storages-docs.netlify.app/es/docs/getting-started)

---

## Installation

```bash
npm install vali-storages
# or
bun add vali-storages
```

---

## Quick Start

```typescript
import { ValiStorages } from 'vali-storages';
import { AES, TimeUnit } from 'vali-storages';

const storage = new ValiStorages({
    isEncrypt: true,
    predefinedKey: 'my-secret-key',
    keySize: AES.AES_256,
    timeExpiration: 2,
    timeUnit: TimeUnit.HOURS,
    prefix: 'myapp',
});

await storage.setItem('user', { name: 'Felipe', role: 'admin' });
const user = await storage.getItem<{ name: string; role: string }>('user');
```

---

## Type-Safe Storage

```typescript
import { createTypedStorage } from 'vali-storages';

interface AppSchema {
    userId: number;
    token: string;
    settings: { theme: 'dark' | 'light' };
}

const storage = createTypedStorage<AppSchema>({ prefix: 'myapp' });

await storage.setItem('userId', 42);           // ✅ OK
await storage.setItem('userId', 'wrong');      // ❌ TypeScript error
const token = await storage.getItem('token'); // → string | null
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **AES-GCM encryption** | AES-128 / 192 / 256 via Web Crypto API |
| ⏱ **TTL expiration** | Seconds, minutes, hours, or days |
| 🔄 **Sliding expiration** | TTL resets on every successful read |
| 🏷 **Namespacing** | Isolate keys between instances with `prefix` |
| 📡 **Cross-tab sync** | React to changes from other browser tabs |
| 🧩 **Batch operations** | `setItems` / `getItems` / `getAll` |
| 🛡 **Error handling** | `throw`, `silent`, or custom handler |
| 🔒 **Type-safe API** | `createTypedStorage<Schema>()` |
| 🖥 **SSR guard** | Clear error when used outside browser |

---

## API Overview

```typescript
// Write
await storage.setItem(key, value)
await storage.setItems({ key1: val1, key2: val2 })

// Read
await storage.getItem<T>(key)                       // T | null
await storage.getItems<T>(['key1', 'key2'])         // Record<string, T | null>
await storage.getAll<T>()                           // Record<string, T>
await storage.getOrSet(key, () => computeValue())   // T

// Check
storage.has(key)       // boolean
storage.size()         // number
storage.getAllKeys()   // string[]

// Delete
storage.removeItem(key)
storage.removeExpired()
storage.clear()

// TTL
storage.updateExpiry(key)   // boolean — reset TTL manually

// Lifecycle
storage.destroy()              // remove cross-tab listener
ValiStorages.isAvailable()    // boolean — check storage availability
```

---

## Changelog

### v2.1.0
- Internal: cross-tab sync extracted to `CrossTabSync` class (SRP) — no public API changes
- Fix: `updateExpiry` uses `safeStorageSet` for consistent quota-exceeded handling
- Fix: `cryptoInstance` properly typed as `ICrypto | null`; all access sites guarded
- Fix: cross-tab decrypt path returns `null` instead of throwing when instance has no crypto

### v2.0.0 (Breaking)
- `setItem` / `getItem` are now `async` — add `await` to all calls
- `getItem` no longer uses a callback — returns `Promise<T | null>`
- Added: `setItems`, `getItems`, `getAll`, `getOrSet`, `has`, `removeExpired`, `updateExpiry`, `size`, `prefix`, `slidingExpiration`, `onError`, `onChange`, `createTypedStorage`, `ValiStorages.isAvailable`, `destroy`

---

## Documentation

- [Getting Started](https://vali-storages-docs.netlify.app/docs/getting-started)
- [API Reference](https://vali-storages-docs.netlify.app/docs/api-reference)
- [Migration from v1.x](https://vali-storages-docs.netlify.app/docs/migration)
- [Changelog](https://vali-storages-docs.netlify.app/docs/changelog)

---

## License

MIT — [Felipe Rafael Montenegro Morriberon](https://fm-portafolio.netlify.app/)
