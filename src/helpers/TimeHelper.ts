import { TimeUnit } from "../enums/TimeUnit";

const MILLISECONDS_PER_UNIT: Record<TimeUnit, number> = {
    [TimeUnit.SECONDS]:      1_000,
    [TimeUnit.MINUTES]:     60_000,
    [TimeUnit.HOURS]:    3_600_000,
    [TimeUnit.DAYS]:    86_400_000,
};

export class TimeHelper {
    public static convertToMilliseconds(time: number, unit: TimeUnit): number {
        return (MILLISECONDS_PER_UNIT[unit] ?? 1) * time;
    }
}