// ---------------------------------------------------------------------------- formatting

export function formatTime(date: Date, is24h: boolean): string {
    if (is24h) {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }
    const hours = date.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const hStr = String(h12).padStart(2, '0');
    const mStr = String(date.getMinutes()).padStart(2, '0');
    const sStr = String(date.getSeconds()).padStart(2, '0');
    return `${hStr}:${mStr}:${sStr} ${period}`;
}

export function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
}

export function formatTimezone(date: Date): string {
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatStopwatch(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    const hStr = String(hundredths).padStart(2, '0');
    return `${mStr}:${sStr}.${hStr}`;
}

export function formatCountdown(sec: number): string {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    return `${mStr}:${sStr}`;
}
