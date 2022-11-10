const formatInt = (int: number) => {
    if (int < 10) return `0${int}`;
    return `${int}`;
};

const formatDuration = (milliseconds: number) => {
    if (!milliseconds) return '00:00';
    const seconds = Math.floor(milliseconds % 60000 / 1000);
    const minutes = Math.floor(milliseconds % 3600000 / 60000);
    const hours = Math.floor(milliseconds / 3600000);
    if (hours > 0) {
        return `${formatInt(hours)}:${formatInt(minutes)}:${formatInt(seconds)}`;
    }
    if (minutes > 0) {
        return `${formatInt(minutes)}:${formatInt(seconds)}`;
    }
    return `00:${formatInt(seconds)}`;
};

const toSecond = (string: string) => {
    if (!string) return 0;

    let h = 0,
        m = 0,
        s = 0;
    if (string.match(/:/g)) {
        const time = string.split(':');
        if (time.length === 2) {
            m = parseInt(time[0], 10);
            s = parseInt(time[1], 10);
        }
        else if (time.length === 3) {
            h = parseInt(time[0], 10);
            m = parseInt(time[1], 10);
            s = parseInt(time[2], 10);
        }
    }
    else {
        s = parseInt(string, 10);
    }

    return h * 60 * 60 + m * 60 + s;
};

export { toSecond, formatInt, formatDuration }