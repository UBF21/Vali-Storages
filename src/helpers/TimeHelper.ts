import { TimeUnit } from '../enums/TimeUnit';

const MS: Record<TimeUnit, number> = {
    [TimeUnit.SECONDS]: 1_000,
    [TimeUnit.MINUTES]: 60_000,
    [TimeUnit.HOURS]:   3_600_000,
    [TimeUnit.DAYS]:    86_400_000,
};

export function convertToMilliseconds(time: number, unit: TimeUnit): number {
    return time * MS[unit];
}
