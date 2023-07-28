/*
Logger class for easy and aesthetically pleasing console logging
*/
import chalk from "chalk";
import { DateTime } from "luxon";

export class Logger {
    log = (shardId: string | number | null = null, content: string, type = "log") => {
        const timestamp = `[${DateTime.now().toFormat("yyyy-LL-dd HH:mm:ss")}]:`;
        switch (type) {
            case "log": {
                return console.log(`${shardId !== null ? `[${shardId}]` : ""}${timestamp} ${chalk.bgBlue(type.toUpperCase())} ${content} `);
            }
            case "warn": {
                return console.log(`${shardId !== null ? `[${shardId}]` : ""}${timestamp} ${chalk.black.bgYellow(type.toUpperCase())} ${content} `);
            }
            case "error": {
                return console.log(`${shardId !== null ? `[${shardId}]` : ""}${timestamp} ${chalk.bgRed(type.toUpperCase())} ${content} `);
            }
            case "debug": {
                return console.log(`${shardId !== null ? `[${shardId}]` : ""}${timestamp} ${chalk.green(type.toUpperCase())} ${content} `);
            }
            case "cmd": {
                return console.log(`${shardId !== null ? `[${shardId}]` : ""}${timestamp} ${chalk.black.bgWhite(type.toUpperCase())} ${content}`);
            }
            case "ready": {
                return console.log(`${shardId !== null ? `[${shardId}]` : ""}${timestamp} ${chalk.black.bgGreen(type.toUpperCase())} ${content}`);
            }
            default: throw new TypeError("Logger type must be either warn, debug, log, ready, cmd or error.");
        }
    };

    error = (...args: [string | number | null, string]) => this.log(...args, "error");
    warn = (...args: [string | number | null, string]) => this.log(...args, "warn");
    debug = (...args: [string | number | null, string]) => this.log(...args, "debug");
    cmd = (...args: [string | number | null, string]) => this.log(...args, "cmd");
    ready = (...args: [string | number | null, string]) => this.log(...args, "ready");
}

export default new Logger;

