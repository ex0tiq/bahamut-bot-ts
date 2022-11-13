const isJson = (str: string) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

const isInt = (str: string) => {
    try {
        parseInt(str);
    } catch (e) {
        return false;
    }
    return true;
};

const isNumeric = (str: string) => {
    if (typeof str != "string") return false;
    return !isNaN(parseInt(str)) && !isNaN(parseFloat(str));
};

const isBigInt = (str: string) => {
    try {
        BigInt(str);
    } catch (e) {
        return false;
    }
    return true;
};

const fileIsVideo = (file: string) => {
    return ["mp4", "webm", "mov"].includes(file.split(".").pop() || "");
};

const isUrl = (s: string) => {
    // eslint-disable-next-line no-useless-escape
    const regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    return regexp.test(s);
};

export { isJson, isInt, isNumeric, isBigInt, isUrl, fileIsVideo };