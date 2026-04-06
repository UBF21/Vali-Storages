# Migración de v1.x a v2.0.0

## Cambios que rompen compatibilidad (Breaking Changes)

### 1. `setItem` ahora es async

**v1.x**
```typescript
storage.setItem('clave', valor); // void — sin manejo de errores
```

**v2.0.0**
```typescript
await storage.setItem('clave', valor); // Promise<void> — awaitable
```

En v1.x los errores se tragaban silenciosamente. En v2.0.0, los errores se propagan al llamante a menos que configures `onError: 'silent'`.

---

### 2. `getItem` ya no usa callback

**v1.x**
```typescript
storage.getItem('clave', (item) => {
    if (item) console.log(item);
});
```

**v2.0.0**
```typescript
const item = await storage.getItem('clave');
if (item) console.log(item);
```

---

## Nuevas funcionalidades en v2.0.0

| Feature | Cómo usarlo |
|---------|-------------|
| Escritura batch | `await storage.setItems({ a: 1, b: 2 })` |
| Lectura batch | `await storage.getItems(['a', 'b'])` |
| Leer todo | `await storage.getAll()` |
| Patrón caché | `await storage.getOrSet(clave, factory)` |
| Verificar existencia | `storage.has(clave)` |
| Purgar expirados | `storage.removeExpired()` |
| Reiniciar TTL | `storage.updateExpiry(clave)` |
| Cantidad de items | `storage.size()` |
| Namespace | `new ValiStorages({ prefix: 'app' })` |
| Sliding TTL | `new ValiStorages({ slidingExpiration: true })` |
| Control de errores | `new ValiStorages({ onError: 'silent' })` |
| Sync cross-tab | `new ValiStorages({ onChange: (k, v) => {} })` |
| API tipada | `createTypedStorage<Schema>()` |
| Verificación SSR | `ValiStorages.isAvailable()` |
| Limpieza | `storage.destroy()` |

---

## Checklist de migración

- [ ] Agregar `await` antes de cada llamada a `setItem`
- [ ] Reemplazar `getItem(clave, callback)` por `const val = await getItem(clave)`
- [ ] En proyectos SSR, envolver la instanciación en `useEffect` o proteger con `ValiStorages.isAvailable()`
- [ ] Considerar migrar a `createTypedStorage<Schema>()` para mayor seguridad de tipos
- [ ] Considerar agregar `prefix` para evitar colisiones de claves entre instancias
