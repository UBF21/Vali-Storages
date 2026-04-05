import { TimeUnit } from "../enums/TimeUnit";

export class TimeHelper{
    public static convertToMilliseconds(time: number, unit: TimeUnit): number {
        switch (unit) {
            case TimeUnit.HOURS:
                return time * 60 * 60 * 1000; // Horas a milisegundos
            case TimeUnit.MINUTES:
                return time * 60 * 1000; // Minutos a milisegundos
            case TimeUnit.DAYS:
                return time * 24 * 60 * 60 * 1000; // Días a milisegundos
            default:
                return time; // Asume que el tiempo ya está en milisegundos si no se proporciona unidad
        }
    }
}