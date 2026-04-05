import { describe, it, expect } from 'vitest';
import { TimeHelper } from '../src/helpers/TimeHelper';
import { TimeUnit } from '../src/enums/TimeUnit';

describe('TimeHelper.convertToMilliseconds', () => {
    it('converts seconds', () => {
        expect(TimeHelper.convertToMilliseconds(1, TimeUnit.SECONDS)).toBe(1_000);
        expect(TimeHelper.convertToMilliseconds(30, TimeUnit.SECONDS)).toBe(30_000);
    });

    it('converts minutes', () => {
        expect(TimeHelper.convertToMilliseconds(1, TimeUnit.MINUTES)).toBe(60_000);
        expect(TimeHelper.convertToMilliseconds(5, TimeUnit.MINUTES)).toBe(300_000);
    });

    it('converts hours', () => {
        expect(TimeHelper.convertToMilliseconds(1, TimeUnit.HOURS)).toBe(3_600_000);
        expect(TimeHelper.convertToMilliseconds(2, TimeUnit.HOURS)).toBe(7_200_000);
    });

    it('converts days', () => {
        expect(TimeHelper.convertToMilliseconds(1, TimeUnit.DAYS)).toBe(86_400_000);
        expect(TimeHelper.convertToMilliseconds(7, TimeUnit.DAYS)).toBe(604_800_000);
    });
});
