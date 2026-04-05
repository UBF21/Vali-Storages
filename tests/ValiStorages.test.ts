import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValiStorages } from '../src/implements/ValiStorages';
import { ICrypto } from '../src/interfaces/ICrypto';
import { TimeUnit } from '../src/enums/TimeUnit';

// Mock de ICrypto para aislar tests de la criptografía real
const makeMockCrypto = (): ICrypto => ({
    importKey: vi.fn().mockResolvedValue(undefined),
    encrypt: vi.fn().mockImplementation(async (data: string) => `enc:${data}`),
    decrypt: vi.fn().mockImplementation(async (data: string) => data.replace('enc:', '')),
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
            const result = await storage.getItem<string>('secret');
            expect(result).toBe('hello');
            expect(mockCrypto.decrypt).toHaveBeenCalled();
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
            // Retrodejar la expiración en el pasado
            const raw = JSON.parse(localStorage.getItem('exp')!);
            raw.expiration = Date.now() - 1;
            localStorage.setItem('exp', JSON.stringify(raw));

            expect(await storage.getItem('exp')).toBeNull();
            expect(localStorage.getItem('exp')).toBeNull();
        });

        it('resets TTL on every setItem', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.HOURS }, mockCrypto);
            await storage.setItem('key', 'v1');
            const first = JSON.parse(localStorage.getItem('key')!).expiration;
            vi.setSystemTime(Date.now() + 60_000);
            await storage.setItem('key', 'v2');
            const second = JSON.parse(localStorage.getItem('key')!).expiration;
            expect(second).toBeGreaterThan(first);
            vi.useRealTimers();
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

        it('does nothing when no items are expired', async () => {
            const storage = new ValiStorages({ timeExpiration: 1, timeUnit: TimeUnit.HOURS }, mockCrypto);
            await storage.setItem('a', 1);
            await storage.setItem('b', 2);
            storage.removeExpired();
            expect(storage.size()).toBe(2);
        });
    });

    // ─── updateExpiry() ──────────────────────────────────────────────────────

    describe('updateExpiry()', () => {
        it('returns false when no TTL is configured', async () => {
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
            const updated = storage.updateExpiry('key');
            const after = JSON.parse(localStorage.getItem('key')!).expiration as number;

            expect(updated).toBe(true);
            expect(after).toBeGreaterThan(before);
            vi.useRealTimers();
        });
    });

    // ─── removeItem / clear ───────────────────────────────────────────────────

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
            const storage = new ValiStorages({}, mockCrypto);
            expect(storage.size()).toBe(0);
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

    // ─── Prefix / namespace ──────────────────────────────────────────────────

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

        it('has() respects prefix', async () => {
            const s1 = new ValiStorages({ prefix: 'ns1' }, mockCrypto);
            const s2 = new ValiStorages({ prefix: 'ns2' }, makeMockCrypto());
            await s1.setItem('key', 'value');
            expect(s1.has('key')).toBe(true);
            expect(s2.has('key')).toBe(false);
        });

        it('removeExpired() only affects own namespace', async () => {
            const s1 = new ValiStorages({ prefix: 'ns1', timeExpiration: 1, timeUnit: TimeUnit.SECONDS }, mockCrypto);
            const s2 = new ValiStorages({ prefix: 'ns2', timeExpiration: 1, timeUnit: TimeUnit.SECONDS }, makeMockCrypto());
            await s1.setItem('key', 'a');
            await s2.setItem('key', 'b');

            const raw = JSON.parse(localStorage.getItem('ns1:key')!);
            raw.expiration = Date.now() - 1;
            localStorage.setItem('ns1:key', JSON.stringify(raw));

            s1.removeExpired();
            expect(localStorage.getItem('ns1:key')).toBeNull();
            expect(localStorage.getItem('ns2:key')).not.toBeNull();
        });
    });

    // ─── QuotaExceededError ──────────────────────────────────────────────────

    describe('QuotaExceededError', () => {
        it('throws descriptive error when storage is full', async () => {
            const storage = new ValiStorages({}, mockCrypto);
            vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
                const err = new DOMException('', 'QuotaExceededError');
                throw err;
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
});
