/**
 * Time and duration formatting utilities for the clock demo.
 */

export function formatTime(date: Date, is24Hour: boolean, timeZone?: string): { time: string; ampm: string } {
    const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: !is24Hour,
        ...(timeZone ? { timeZone } : {}),
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    let time = '';
    let ampm = '';

    for (const part of parts) {
        if (part.type === 'dayPeriod') {
            ampm = part.value;
        } else {
            time += part.value;
        }
    }

    return { time: time.trim(), ampm };
}

export function formatDate(date: Date, timeZone?: string): string {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...(timeZone ? { timeZone } : {}),
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function formatStopwatch(ms: number): { main: string; msStr: string } {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);

    const pad = (n: number) => String(n).padStart(2, '0');
    return {
        main: `${pad(minutes)}:${pad(seconds)}`,
        msStr: pad(hundredths),
    };
}

export function formatCountdown(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}
