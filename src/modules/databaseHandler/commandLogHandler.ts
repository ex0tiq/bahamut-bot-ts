import BahamutDBHandler, {DBGuildCommandLog, DBGuildUserStats} from "../BahamutDBHandler";
import Discord from "discord.js";
import {Op} from "sequelize";

export default class CommandLogHandler {
// DB Handler instance
    private _dbHandler: BahamutDBHandler;

    constructor(dbHandler: BahamutDBHandler) {
        this._dbHandler = dbHandler;
    }

    /**
     * Increase a bot stat by x
     * @param guild
     * @param user
     * @param channel
     * @param command
     * @param args
     * @returns {Promise<boolean>}
     */
    addDBGuildCommandLog = async (guild: Discord.Guild, user: Discord.GuildMember, channel: Discord.TextChannel, command: string, args: string[] = []): Promise<boolean> => {
        return new Promise((resolve) => {
            DBGuildCommandLog.create({
                guild_id: guild.id,
                guild_user: user.user.id,
                guild_username: user.user.username,
                guild_channel: channel.id,
                command: command,
                args: args.join(" "),
            }).then(() => {
                resolve(true);
            }).catch(e => {
                console.error("Error while saving guild user stat:", e);
                resolve(false);
            });
        });
    };

    /**
     * Get guild command log count
     * @param {*} guild
     * @returns
     */
    getDBGuildCommandLogCount = async (guild: Discord.Guild): Promise<number> => {
        return new Promise((resolve) => {
            return DBGuildCommandLog
                .count({
                    where: {
                        guild_id: guild.id,
                    },
                })
                .then(async (count: number) => {
                    resolve(count);
                }).catch(e => {
                    console.error("Error while fetching command log count:", e);
                    resolve(0);
                });
        });
    };

    /**
     * Get user command log count
     * @param guild
     * @param {*} user
     * @returns
     */
    getDBUserCommandLogCount = async (guild: Discord.Guild, user: Discord.GuildMember): Promise<number> => {
        return new Promise((resolve) => {
            return DBGuildCommandLog
                .count({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.id,
                    },
                })
                .then(async (count: number) => {
                    resolve(count);
                }).catch(e => {
                    console.error("Error while fetching command log count:", e);
                    resolve(0);
                });
        });
    };

    /**
     * Get full command log count
     * @returns
     */
    getFullCommandLogCount = async (): Promise<number> => {
        return new Promise((resolve) => {
            return DBGuildCommandLog
                .count()
                .then(async (count: number) => {
                    resolve(count);
                }).catch(e => {
                    console.error("Error while fetching command log count:", e);
                    resolve(0);
                });
        });
    };
}
