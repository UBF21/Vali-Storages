import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValiStorages } from '../src/implements/ValiStorages';
import { createTypedStorage } from '../src/factories/createTypedStorage';
import { ICrypto } from '../src/interfaces/ICrypto';
import { TimeUnit } from '../src/enums/TimeUnit';

const makeMockCrypto = (): ICrypto => ({
    importKey: vi.fn().mockResolvedValue(undefined),
    encrypt: vi.fn().mockImplementation(async (data: string) => `enc:${data}`),
    decrypt: vi.fn().mockImplementation(async (data: string) => data.replace('enc:', '')),
});

const makeFailingCrypto = (): ICrypto => ({
    importKey: vi.fn().mockResolvedValue(undefined),
    encrypt: vi.fn().mockRejectedValue(new Error('crypto failed')),
    decrypt: vi.fn().mockRejectedValue(new Error('crypto failed')),
});

describe('ValiStorages', () => {
    let mockCrypto: ICrypto;

    beforeEach(() => {
        localStorage.clear();
        mockCrypto = makeMockCrypto();
    });

    // ─── setItem / getItem ───────────────────────────────────────────────────

    describe('setItem / getItem', () => {
        it('stores and retrieves a primitive value', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('num', 42);
            expect(await storage.getItem<number>('num')).toBe(42);
        });

        it('stores and retrieves an object', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('user', { name: 'Felipe', age: 30 });
            expect(await storage.getItem('user')).toEqual({ name: 'Felipe', age: 30 });
        });

        it('returns null for non-existent key', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            expect(await storage.getItem('missing')).toBeNull();
        });

        it('overwrites an existing key', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('key', 'first');
            await storage.setItem('key', 'second');
            expect(await storage.getItem('key')).toBe('second');
        });

        it('encrypts value when isEncrypt is true', async () => {
            const storage = new ValiStorages({ isEncrypt: true }, mockCrypto);
            await storage.setItem('secret', 'hello');
            expect(mockCrypto.encrypt).toHaveBeenCalledWith(JSON.stringify('hello'));
        });

        it('decrypts value when isEncrypt is true', async () => {
            const storage = new ValiStorages({ isEncrypt: true }, mockCrypto);
            await storage.setItem('secret', 'hello');
            expect(await storage.getItem<string>('secret')).toBe('hello');
        });
    });

    // ─── setItems / getItems / getAll ────────────────────────────────────────

    describe('setItems()', () => {
        it('stores multiple items at once', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItems({ a: 1, b: 2, c: 3 });
            expect(await storage.getItem('a')).toBe(1);
            expect(await storage.getItem('b')).toBe(2);
            expect(await storage.getItem('c')).toBe(3);
        });
    });

    describe('getItems()', () => {
        it('returns values for existing keys', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('x', 10);
            await storage.setItem('y', 20);
            const result = await storage.getItems<number>(['x', 'y', 'z']);
            expect(result).toEqual({ x: 10, y: 20, z: null });
        });

        it('returns null for expired keys in batch', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.SECONDS }, mockCrypto);
            await storage.setItem('exp', 'value');
            const raw = JSON.parse(localStorage.getItem('exp')!);
            raw.expiration = Date.now() - 1;
            localStorage.setItem('exp', JSON.stringify(raw));
            const result = await storage.getItems(['exp']);
            expect(result['exp']).toBeNull();
        });
    });

    describe('getAll()', () => {
        it('returns all non-expired items', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('a', 1);
            await storage.setItem('b', 2);
            expect(await storage.getAll()).toEqual({ a: 1, b: 2 });
        });

        it('returns empty object for empty storage', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            expect(await storage.getAll()).toEqual({});
        });

        it('excludes expired items', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.SECONDS }, mockCrypto);
            await storage.setItem('keep', 'a');
            await storage.setItem('expired', 'b');
            const raw = JSON.parse(localStorage.getItem('expired')!);
            raw.expiration = Date.now() - 1;
            localStorage.setItem('expired', JSON.stringify(raw));
            const all = await storage.getAll();
            expect(all).toHaveProperty('keep');
            expect(all).not.toHaveProperty('expired');
        });
    });

    // ─── TTL expiration ──────────────────────────────────────────────────────

    describe('TTL expiration', () => {
        it('returns value when not expired', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.HOURS }, mockCrypto);
            await storage.setItem('key', 'value');
            expect(await storage.getItem('key')).toBe('value');
        });

        it('returns null and removes item when expired', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.SECONDS }, mockCrypto);
            await storage.setItem('exp', 'value');
            const raw = JSON.parse(localStorage.getItem('exp')!);
            raw.expiration = Date.now() - 1;
            localStorage.setItem('exp', JSON.stringify(raw));
            expect(await storage.getItem('exp')).toBeNull();
            expect(localStorage.getItem('exp')).toBeNull();
        });

        it('resets TTL on every setItem', async () => {
            vi.useFakeTimers();
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.HOURS }, mockCrypto);
            await storage.setItem('key', 'v1');
            const first = JSON.parse(localStorage.getItem('key')!).expiration;
            vi.advanceTimersByTime(60_000);
            await storage.setItem('key', 'v2');
            const second = JSON.parse(localStorage.getItem('key')!).expiration;
            expect(second).toBeGreaterThan(first);
            vi.useRealTimers();
        });
    });

    // ─── slidingExpiration ───────────────────────────────────────────────────

    describe('slidingExpiration', () => {
        it('resets TTL on successful getItem', async () => {
            vi.useFakeTimers();
            const storage = new ValiStorages(
                { timeExpiration: 1, timeUnit: TimeUnit.HOURS, slidingExpiration: true },
                mockCrypto
            );
            await storage.setItem('key', 'value');
            const before = JSON.parse(localStorage.getItem('key')!).expiration as number;
            vi.advanceTimersByTime(30 * 60 * 1000); // +30 min
            await storage.getItem('key');
            const after = JSON.parse(localStorage.getItem('key')!).expiration as number;
            expect(after).toBeGreaterThan(before);
            vi.useRealTimers();
        });

        it('does not slide TTL for expired items', async () => {
            const storage = new ValiStorages(
                { timeExpiration: 1, timeUnit: TimeUnit.SECONDS, slidingExpiration: true },
                mockCrypto
            );
            await storage.setItem('exp', 'value');
            const raw = JSON.parse(localStorage.getItem('exp')!);
            raw.expiration = Date.now() - 1;
            localStorage.setItem('exp', JSON.stringify(raw));
            expect(await storage.getItem('exp')).toBeNull();
            expect(localStorage.getItem('exp')).toBeNull();
        });

        it('does not slide when no TTL is configured', async () => {
            const storage = new ValiStorages({ slidingExpiration: true }, mockCrypto);
            await storage.setItem('key', 'value');
            await storage.getItem('key');
            const item = JSON.parse(localStorage.getItem('key')!);
            expect(item.expiration).toBeUndefined();
        });
    });

    // ─── onError ─────────────────────────────────────────────────────────────

    describe('onError', () => {
        it('throws by default on crypto failure', async () => {
            const storage = new ValiStorages({ isEncrypt: true }, makeFailingCrypto());
            await expect(storage.setItem('key', 'value')).rejects.toThrow('crypto failed');
        });

        it('silently ignores errors when onError is "silent"', async () => {
            const storage = new ValiStorages({ isEncrypt: true, onError: 'silent' }, makeFailingCrypto());
            await expect(storage.setItem('key', 'value')).resolves.toBeUndefined();
            await expect(storage.getItem('key')).resolves.toBeNull();
        });

        it('calls error handler function with correct args', async () => {
            const handler = vi.fn();
            const storage = new ValiStorages({ isEncrypt: true, onError: handler }, makeFailingCrypto());
            await storage.setItem('mykey', 'value');
            expect(handler).toHaveBeenCalledWith(expect.any(Error), 'setItem', 'mykey');
        });

        it('calls error handler for getItem failure', async () => {
            const handler = vi.fn();
            const storage = new ValiStorages({ isEncrypt: true, onError: handler }, makeFailingCrypto());
            // Manually put an encrypted item so getItem tries to decrypt
            localStorage.setItem('mykey', JSON.stringify({ value: 'enc:something' }));
            await storage.getItem('mykey');
            expect(handler).toHaveBeenCalledWith(expect.any(Error), 'getItem', 'mykey');
        });
    });

    // ─── onChange / cross-tab sync ───────────────────────────────────────────

    describe('onChange (cross-tab sync)', () => {
        it('calls onChange when storage event fires for own key', async () => {
            const handler = vi.fn();
            const storage = new ValiStorages({ prefix: 'app', onChange: handler }, mockCrypto);

            const event = new StorageEvent('storage', {
                key: 'app:user',
                newValue: JSON.stringify({ value: JSON.stringify({ name: 'Felipe' }) }),
                storageArea: localStorage,
            });
            window.dispatchEvent(event);

            expect(handler).toHaveBeenCalledWith('user', { name: 'Felipe' });
            storage.destroy();
        });

        it('calls onChange with null when item is deleted in another tab', () => {
            const handler = vi.fn();
            const storage = new ValiStorages({ prefix: 'app', onChange: handler }, mockCrypto);

            const event = new StorageEvent('storage', {
                key: 'app:session',
                newValue: null,
                storageArea: localStorage,
            });
            window.dispatchEvent(event);

            expect(handler).toHaveBeenCalledWith('session', null);
            storage.destroy();
        });

        it('ignores storage events from different namespace', () => {
            const handler = vi.fn();
            const storage = new ValiStorages({ prefix: 'app', onChange: handler }, mockCrypto);

            const event = new StorageEvent('storage', {
                key: 'other:key',
                newValue: JSON.stringify({ value: '"data"' }),
                storageArea: localStorage,
            });
            window.dispatchEvent(event);

            expect(handler).not.toHaveBeenCalled();
            storage.destroy();
        });
    });

    // ─── destroy() ───────────────────────────────────────────────────────────

    describe('destroy()', () => {
        it('removes event listener — onChange no longer fires after destroy', () => {
            const handler = vi.fn();
            const storage = new ValiStorages({ prefix: 'app', onChange: handler }, mockCrypto);
            storage.destroy();

            const event = new StorageEvent('storage', {
                key: 'app:key',
                newValue: JSON.stringify({ value: '"data"' }),
                storageArea: localStorage,
            });
            window.dispatchEvent(event);

            expect(handler).not.toHaveBeenCalled();
        });

        it('does not throw when destroy is called without onChange', () => {
            const storage = new ValiStorages({}, mockCrypto);
            expect(() => storage.destroy()).not.toThrow();
        });
    });

    // ─── has() ───────────────────────────────────────────────────────────────

    describe('has()', () => {
        it('returns true for existing non-expired key', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('key', 'value');
            expect(storage.has('key')).toBe(true);
        });

        it('returns false for non-existent key', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            expect(storage.has('missing')).toBe(false);
        });

        it('returns false and removes expired key', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.SECONDS }, mockCrypto);
            await storage.setItem('exp', 'value');
            const raw = JSON.parse(localStorage.getItem('exp')!);
            raw.expiration = Date.now() - 1;
            localStorage.setItem('exp', JSON.stringify(raw));
            expect(storage.has('exp')).toBe(false);
            expect(localStorage.getItem('exp')).toBeNull();
        });
    });

    // ─── getOrSet() ──────────────────────────────────────────────────────────

    describe('getOrSet()', () => {
        it('returns existing value without calling factory', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('key', 'existing');
            const factory = vi.fn().mockResolvedValue('new');
            expect(await storage.getOrSet('key', factory)).toBe('existing');
            expect(factory).not.toHaveBeenCalled();
        });

        it('calls factory and stores when key is missing', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            const factory = vi.fn().mockResolvedValue('computed');
            expect(await storage.getOrSet('key', factory)).toBe('computed');
            expect(factory).toHaveBeenCalledOnce();
            expect(await storage.getItem('key')).toBe('computed');
        });

        it('accepts a sync factory', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            expect(await storage.getOrSet('key', () => 99)).toBe(99);
        });
    });

    // ─── removeExpired() ─────────────────────────────────────────────────────

    describe('removeExpired()', () => {
        it('removes only expired items', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.SECONDS }, mockCrypto);
            await storage.setItem('keep', 'v');
            await storage.setItem('gone', 'v');
            const raw = JSON.parse(localStorage.getItem('gone')!);
            raw.expiration = Date.now() - 1;
            localStorage.setItem('gone', JSON.stringify(raw));
            storage.removeExpired();
            expect(localStorage.getItem('keep')).not.toBeNull();
            expect(localStorage.getItem('gone')).toBeNull();
        });
    });

    // ─── updateExpiry() ──────────────────────────────────────────────────────

    describe('updateExpiry()', () => {
        it('returns false when no TTL configured', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('key', 'value');
            expect(storage.updateExpiry('key')).toBe(false);
        });

        it('returns false when key does not exist', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.HOURS }, mockCrypto);
            expect(storage.updateExpiry('missing')).toBe(false);
        });

        it('resets the expiration timestamp forward', async () => {
            vi.useFakeTimers();
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.HOURS }, mockCrypto);
            await storage.setItem('key', 'value');
            const before = JSON.parse(localStorage.getItem('key')!).expiration as number;
            vi.advanceTimersByTime(5_000);
            storage.updateExpiry('key');
            const after = JSON.parse(localStorage.getItem('key')!).expiration as number;
            expect(after).toBeGreaterThan(before);
            vi.useRealTimers();
        });
    });

    // ─── removeItem / clear ──────────────────────────────────────────────────

    describe('removeItem()', () => {
        it('removes the specified key', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('key', 'value');
            storage.removeItem('key');
            expect(await storage.getItem('key')).toBeNull();
        });
    });

    describe('clear()', () => {
        it('removes all keys when no prefix', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('a', 1);
            await storage.setItem('b', 2);
            storage.clear();
            expect(storage.size()).toBe(0);
        });
    });

    // ─── size() / getAllKeys() ────────────────────────────────────────────────

    describe('size()', () => {
        it('returns 0 for empty storage', () => {
            expect(new ValiStorages({}, mockCrypto).size()).toBe(0);
        });

        it('counts stored items', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('a', 1);
            await storage.setItem('b', 2);
            expect(storage.size()).toBe(2);
        });
    });

    describe('getAllKeys()', () => {
        it('returns all stored keys', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            await storage.setItem('x', 1);
            await storage.setItem('y', 2);
            expect(storage.getAllKeys()).toEqual(expect.arrayContaining(['x', 'y']));
        });
    });

    // ─── prefix / namespace ──────────────────────────────────────────────────

    describe('prefix / namespace', () => {
        it('isolates keys between namespaces', async () => {
            const s1 = new ValiStorages({ prefix: 'app1' }, mockCrypto);
            const s2 = new ValiStorages({ prefix: 'app2' }, makeMockCrypto());
            await s1.setItem('key', 'from-app1');
            await s2.setItem('key', 'from-app2');
            expect(await s1.getItem('key')).toBe('from-app1');
            expect(await s2.getItem('key')).toBe('from-app2');
        });

        it('getAllKeys returns unprefixed keys', async () => {
            const storage = new ValiStorages({ prefix: 'ns' }, mockCrypto);
            await storage.setItem('a', 1);
            await storage.setItem('b', 2);
            const keys = storage.getAllKeys();
            expect(keys).toEqual(expect.arrayContaining(['a', 'b']));
            expect(keys.every(k => !k.startsWith('ns:'))).toBe(true);
        });

        it('clear() with prefix only removes own keys', async () => {
            const s1 = new ValiStorages({ prefix: 'ns1' }, mockCrypto);
            const s2 = new ValiStorages({ prefix: 'ns2' }, makeMockCrypto());
            await s1.setItem('key', 'a');
            await s2.setItem('key', 'b');
            s1.clear();
            expect(await s1.getItem('key')).toBeNull();
            expect(await s2.getItem('key')).toBe('b');
        });

        it('size() counts only own namespace keys', async () => {
            const s1 = new ValiStorages({ prefix: 'ns1' }, mockCrypto);
            const s2 = new ValiStorages({ prefix: 'ns2' }, makeMockCrypto());
            await s1.setItem('a', 1);
            await s1.setItem('b', 2);
            await s2.setItem('c', 3);
            expect(s1.size()).toBe(2);
            expect(s2.size()).toBe(1);
        });

        it('getAll() respects namespace', async () => {
            const s1 = new ValiStorages({ prefix: 'ns1' }, mockCrypto);
            const s2 = new ValiStorages({ prefix: 'ns2' }, makeMockCrypto());
            await s1.setItem('x', 1);
            await s2.setItem('y', 2);
            const all = await s1.getAll();
            expect(all).toEqual({ x: 1 });
        });
    });

    // ─── QuotaExceededError ──────────────────────────────────────────────────

    describe('QuotaExceededError', () => {
        it('throws descriptive error when storage is full', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
                throw new DOMException('', 'QuotaExceededError');
            });
            await expect(storage.setItem('key', 'value')).rejects.toThrow('Storage quota exceeded');
        });
    });

    // ─── isAvailable() ───────────────────────────────────────────────────────

    describe('isAvailable()', () => {
        it('returns true in normal browser environment', () => {
            expect(ValiStorages.isAvailable()).toBe(true);
        });

        it('returns false when localStorage throws on write', () => {
            vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
                throw new DOMException('', 'SecurityError');
            });
            expect(ValiStorages.isAvailable()).toBe(false);
        });
    });

    // ─── createTypedStorage ──────────────────────────────────────────────────

    describe('createTypedStorage()', () => {
        interface AppSchema {
            userId: number;
            token: string;
            settings: { theme: 'dark' | 'light' };
        }

        it('stores and retrieves typed values', async () => {
            const storage = createTypedStorage<AppSchema>({}, mockCrypto);
            await storage.setItem('userId', 42);
            expect(await storage.getItem('userId')).toBe(42);
        });

        it('setItems with partial schema', async () => {
            const storage = createTypedStorage<AppSchema>({}, mockCrypto);
            await storage.setItems({ userId: 1, token: 'abc' });
            expect(await storage.getItem('userId')).toBe(1);
            expect(await storage.getItem('token')).toBe('abc');
        });

        it('getAll returns typed result', async () => {
            const storage = createTypedStorage<AppSchema>({}, mockCrypto);
            await storage.setItem('token', 'xyz');
            const all = await storage.getAll();
            expect(all.token).toBe('xyz');
        });

        it('has / removeItem / size / clear work correctly', async () => {
            const storage = createTypedStorage<AppSchema>({}, mockCrypto);
            await storage.setItem('token', 'abc');
            expect(storage.has('token')).toBe(true);
            expect(storage.size()).toBe(1);
            storage.removeItem('token');
            expect(storage.has('token')).toBe(false);
            expect(storage.size()).toBe(0);
        });
    });
});
