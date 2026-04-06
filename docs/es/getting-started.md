# Primeros pasos

## Instalación

```bash
npm install vali-storages
# o
bun add vali-storages
```

---

## Uso básico

```typescript
import { ValiStorages } from 'vali-storages';

const storage = new ValiStorages();

await storage.setItem('usuario', 'felipe');
const usuario = await storage.getItem<string>('usuario');
// → 'felipe'
```

---

## Con encriptación

Encripta todos los valores usando AES-GCM a través de la Web Crypto API:

```typescript
import { ValiStorages, AES } from 'vali-storages';

const storage = new ValiStorages({
    isEncrypt: true,
    predefinedKey: 'mi-frase-secreta',
    keySize: AES.AES_256,
});

await storage.setItem('token', 'jwt-super-secreto');
const token = await storage.getItem<string>('token');
// → 'jwt-super-secreto' (desencriptado automáticamente)
```

> **Importante:** Usa siempre la misma `predefinedKey` al instanciar la clase. La derivación de clave es determinista — la misma frase siempre produce la misma clave de encriptación.

---

## Con expiración TTL

Los items expiran y son eliminados automáticamente en la siguiente lectura:

```typescript
import { ValiStorages, TimeUnit } from 'vali-storages';

const storage = new ValiStorages({
    timeExpiration: 30,
    timeUnit: TimeUnit.MINUTES,
});

await storage.setItem('sesion', { userId: 42 });

// 30 minutos después...
const sesion = await storage.getItem('sesion');
// → null (expiró y fue eliminado)
```

---

## Con namespace (prefix)

Aísla las claves entre distintas partes de tu aplicación para evitar colisiones:

```typescript
const authStorage = new ValiStorages({ prefix: 'auth' });
const cartStorage = new ValiStorages({ prefix: 'carrito' });

await authStorage.setItem('token', 'abc');
await cartStorage.setItem('token', 'xyz');

// No se interfieren entre sí
await authStorage.getItem('token'); // → 'abc'
await cartStorage.getItem('token'); // → 'xyz'

// getAllKeys / clear / size solo afectan su propio namespace
authStorage.size(); // → 1
cartStorage.clear(); // elimina solo las claves del carrito
```

---

## Sliding expiration

El TTL se reinicia automáticamente en cada lectura exitosa (mantiene activas las sesiones):

```typescript
const storage = new ValiStorages({
    timeExpiration: 30,
    timeUnit: TimeUnit.MINUTES,
    slidingExpiration: true,
});

await storage.setItem('sesion', datos);

// El usuario lee la sesión — el TTL se reinicia a 30 minutos más
await storage.getItem('sesion');
```

---

## Sincronización cross-tab

Reacciona a cambios realizados en **otras pestañas** del mismo origen:

```typescript
const storage = new ValiStorages({
    prefix: 'miapp',
    onChange: (clave, nuevoValor) => {
        if (clave === 'tema') aplicarTema(nuevoValor as string);
        if (nuevoValor === null) console.log(`${clave} fue eliminado`);
    },
});

// Cuando ya no necesites escuchar cambios (ej: unmount del componente):
storage.destroy();
```

---

## Manejo de errores

```typescript
// Por defecto: lanza el error
const storage = new ValiStorages({ onError: 'throw' });

// Silencioso: retorna null en getters, ignora errores en setters
const storage = new ValiStorages({ onError: 'silent' });

// Manejador personalizado (ej: reportar a Sentry)
const storage = new ValiStorages({
    onError: (error, operacion, clave) => {
        Sentry.captureException(error, { extra: { operacion, clave } });
    },
});
```

---

## Storage tipado

Usa `createTypedStorage<Schema>()` para verificación de tipos en tiempo de compilación:

```typescript
import { createTypedStorage } from 'vali-storages';

interface AppSchema {
    userId: number;
    token: string;
    configuracion: { tema: 'oscuro' | 'claro'; idioma: string };
}

const storage = createTypedStorage<AppSchema>({
    prefix: 'miapp',
    isEncrypt: true,
    predefinedKey: 'secreto',
});

await storage.setItem('userId', 42);             // ✅ OK
await storage.setItem('userId', 'hola');         // ❌ Error de TypeScript
await storage.setItem('claveDesconocida', 'x');  // ❌ Clave no está en el schema

const id = await storage.getItem('userId');      // → number | null
```

---

## Compatibilidad SSR / Next.js

`ValiStorages` requiere un entorno con `window`. En frameworks SSR, protege la instanciación:

```typescript
// Verifica disponibilidad antes de instanciar
if (ValiStorages.isAvailable()) {
    const storage = new ValiStorages({ prefix: 'app' });
}

// En Next.js / React, usa useEffect
useEffect(() => {
    const storage = new ValiStorages({ prefix: 'app' });
    // usa storage aquí
}, []);
```

---

## Próximos pasos

- [Referencia de API](api-reference.md) — documentación completa de métodos
- [Migración desde v1.x](migration.md) — guía de actualización
