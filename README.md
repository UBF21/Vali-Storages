# Vali-Storages - Documentation

`ValiStorages` es una clase que facilita el manejo de almacenamiento en el navegador (`localStorage` o `sessionStorage`) con soporte para cifrado de datos y control de expiración. Esta clase es altamente configurable, permitiendo al desarrollador decidir si quiere cifrar los datos, cuánto tiempo deben durar antes de expirar, y si debe utilizar `localStorage` o `sessionStorage`.

## Instalación

Puedes instalar este paquete usando npm:

```bash
npm i vali-storages
```

## Configuración


### ValiStoragesConfig

La Clase ValiStorage acepta un objeto de configuración que sigue la interfaz `IValiStoragesConfig`:


| Propiedad          | Tipo      | Descripción                                                                                   |
|--------------------|-----------|-----------------------------------------------------------------------------------------------|
| `predefinedKey`    | `string`  | Frase de contraseña utilizada para derivar la clave criptográfica.                            |
| `keySize`          | `AES`     | Tamaño de la clave AES a utilizar. Puede ser `AES_128`, `AES_192`, o `AES_256`.               |
| `timeExpiration`   | `number`  | Tiempo después del cual los datos expiran.                                                    |
| `timeUnit`         | `TimeUnit`| Unidad de tiempo para la expiración (`hours`, `minutes`, `days`).                             |
| `isEncrypt`        | `boolean` | Indica si los datos deben cifrarse antes de ser almacenados.                                  |
| `useSessionStorage`| `boolean` | Indica si se debe utilizar `sessionStorage` en lugar de `localStorage`.                       |


## Ejemplo de configuración

```typescript

import { ValiStorages } from 'vali-storages';
import { AES, TimeUnit } from 'vali-storages/enums';

const storage = new ValiStorages({
    isEncrypt: true,
    keySize: AES.AES_256,
    predefinedKey: 'mi-clave-secreta',
    timeExpiration: 2,
    timeUnit: TimeUnit.HOURS,
    useSessionStorage: false
});

```
## Uso

### Inicialización

Para crear una instancia de `ValiStorages`, simplemente pasa la configuración como un objeto al constructor:


```typescript
const storage = new ValiStorages({ /* configuración */ });
```

## Métodos Disponibles


### `setItem(key: string, value: T): void`


Guarda un item en el almacenamiento. Si se ha habilitado el cifrado, los datos serán cifrados antes de ser almacenados.


### Parámetros:

- `key`: Clave para identificar el item.

- `value`: Valor a almacenar. Puede ser de cualquier tipo

### Ejemplo:

```typescript
storage.setItem('key', { usuario: 'jhon', edad: 30 });
```

### `getItem(key: string, callback: (item: T | null) => void): void`


Recupera un item del almacenamiento. Si se ha habilitado el cifrado, los datos serán descifrados antes de ser devueltos.


### Parámetros:

- `key`: Clave para identificar el item.

- `value`: Función que recibe el valor recuperado o `null` si no se encuentra o ha expirado


### Ejemplo:

```typescript
storage.getItem('key', (item) => {
    if (item) {
        console.log('Datos recuperados:', item);
    } else {
        console.log('El item no existe o ha expirado');
    }
});
```


### `removeItem(key: string): void`


Elimina un item del almacenamiento.


### Parámetros:

- `key`: Clave del item a eliminar.

### Ejemplo:

```typescript
storage.removeItem('key');
```

### `clear(): void`

Limpia todo el almacenamiento.

### Ejemplo:

```typescript
storage.clear();

```

### `getAllKeys(): string[]`

Devuelve todas las claves almacenadas.

### Ejemplo:

```typescript
const keys = storage.getAllKeys();
console.log('Claves almacenadas:', keys);
```

## Enums


### AES

Enum para definir el tamaño de la clave AES:

- `AES_128 = 16` (128 bits)
- `AES_192 = 24` (192 bits)
- `AES_256 = 32` (256 bits)



### TimeUnit

Enum para definir la unidad de tiempo para la expiración:

- `HOURS = 'hours'`
- `MINUTES = 'minutes'`
- `DAYS = 'days'`

## Clases Auxiliares

### Crypto

Clase interna para manejar el cifrado y descifrado usando AES-GCM.


### TimeHelper

Clase estática para convertir unidades de tiempo a milisegundos.


## Ejemplo Completo

```typescript
import { ValiStorages } from 'vali-storages';
import { AES, TimeUnit } from 'vali-storages/enums';

const storage = new ValiStorages({
    isEncrypt: true,
    keySize: AES.AES_256,
    predefinedKey: 'key-secret',
    timeExpiration: 1,
    timeUnit: TimeUnit.DAYS,
    useSessionStorage: false
});

// Guardar datos
storage.setItem('key', { usuario: 'jhon', edad: 30 });

// Recuperar datos
storage.getItem('key', (item) => {
    if (item) {
        console.log('Datos recuperados:', item);
    } else {
        console.log('El item no existe o ha expirado');
    }
});

```