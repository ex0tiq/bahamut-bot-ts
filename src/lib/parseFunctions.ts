/**
 * Parse a string to a boolean value
 * @param {string} string
 * @returns {null|boolean}
 */
const parseBool = (string: string) => {
    if ((string.toLowerCase() === "true") || (string.toLowerCase() === "1")) {
        return true;
    } else if ((string.toLowerCase() === "false") || (string.toLowerCase() === "0")) {
        return false;
    } else {
        return null;
    }
};

export { parseBool };