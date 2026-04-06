# Migration from v1.x to v2.0.0

## Breaking Changes

### 1. `setItem` is now async

**v1.x**
```typescript
storage.setItem('key', value); // void — fire and forget
```

**v2.0.0**
```typescript
await storage.setItem('key', value); // Promise<void> — awaitable
```

Errors in v1.x were silently swallowed. In v2.0.0, errors propagate to the caller unless you configure `onError: 'silent'`.

---

### 2. `getItem` no longer uses a callback

**v1.x**
```typescript
storage.getItem('key', (item) => {
    if (item) console.log(item);
});
```

**v2.0.0**
```typescript
const item = await storage.getItem('key');
if (item) console.log(item);
```

---

## New Features in v2.0.0

| Feature | How to use |
|---------|-----------|
| Batch write | `await storage.setItems({ a: 1, b: 2 })` |
| Batch read | `await storage.getItems(['a', 'b'])` |
| Read all | `await storage.getAll()` |
| Cache pattern | `await storage.getOrSet(key, factory)` |
| Check existence | `storage.has(key)` |
| Purge expired | `storage.removeExpired()` |
| Reset TTL | `storage.updateExpiry(key)` |
| Item count | `storage.size()` |
| Namespace | `new ValiStorages({ prefix: 'app' })` |
| Sliding TTL | `new ValiStorages({ slidingExpiration: true })` |
| Error control | `new ValiStorages({ onError: 'silent' })` |
| Cross-tab sync | `new ValiStorages({ onChange: (key, val) => {} })` |
| Type-safe API | `createTypedStorage<Schema>()` |
| SSR check | `ValiStorages.isAvailable()` |
| Cleanup | `storage.destroy()` |

---

## Migration Checklist

- [ ] Add `await` before every `setItem` call
- [ ] Replace `getItem(key, callback)` with `const val = await getItem(key)`
- [ ] Wrap instantiation in `useEffect` or guard with `ValiStorages.isAvailable()` for SSR projects
- [ ] Consider switching to `createTypedStorage<Schema>()` for type safety
- [ ] Consider adding `prefix` to avoid key collisions between instances
