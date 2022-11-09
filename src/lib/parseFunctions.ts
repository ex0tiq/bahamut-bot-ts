
/**
 * Parse a string to a boolean value
 * @param {string} string
 * @returns {null|boolean}
 */
const parseBool = (string: string) => {
    if ((string.toLowerCase() === 'true') || (string.toLowerCase() === '1')) {
        return true;
    }
    else if ((string.toLowerCase() === 'false') || (string.toLowerCase() === '0')) {
        return false;
    }
    else {
        return null;
    }
};

const hexToRGB = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    }
    else {
        return 'rgb(' + r + ', ' + g + ', ' + b + ')';
    }
};

const hexToDecimal = (hex: string) => {
    return parseInt(hex, 16);
}

export { hexToDecimal, hexToRGB, parseBool }