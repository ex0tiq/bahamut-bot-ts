import BahamutDBHandler, { DBGuildUserStats } from "../BahamutDBHandler";
import Discord from "discord.js";
import {Op, WhereOptions} from "sequelize";

export default class GuildUserStatHandler {
    // DB Handler instance
    private _dbHandler: BahamutDBHandler;

    constructor(dbHandler: BahamutDBHandler) {
        this._dbHandler = dbHandler;
    }

    /**
     * Get current guild users stats
     * @param guild
     * @param user
     * @param stats
     */
    getDBGuildUserStats = async (guild: Discord.Guild, user: Discord.GuildMember | null, stats?: string[]): Promise<Map<string, number> | null> => {
        const where: WhereOptions = {
            guild_id: guild.id,
            [Op.or]: stats?.map(e => {
                return {
                    stat: e,
                };
            }),
        };

        if (user) where["guild_user"] = user.user.id;

        const res: DBGuildUserStats[] | null = await new Promise((resolve) => {
            return DBGuildUserStats
                .findAll({
                    where: where,
                })
                .then(async (obj: DBGuildUserStats[] | null) => {
                    if (obj) resolve(obj);
                    else resolve(null);
                }).catch(e => {
                    console.error("Error while saving guild user stat:", e);
                    resolve(null);
                });
        });

        if (!res) return null;

        const resMap = new Map<string, number>;
        for (const s of res) {
            resMap.set(s.stat, s.val);
        }

        return resMap;
    };

    /**
     * Update a guild user stat
     * @param {Discord.Guild} guild
     * @param {Discord.User} user
     * @param {string} stat
     * @param {string|boolean} value
     * @returns {Promise<boolean>}
     */
    setDBGuildUserStat = async (guild: Discord.Guild, user: Discord.GuildMember, stat: string, value: number): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserStats
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id,
                        stat: stat,
                    } })
                .then(async (obj: DBGuildUserStats | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            val: value,
                        });
                    }
 else {
                        // insert
                        await DBGuildUserStats.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            stat: stat,
                            val: value,
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error("Error while saving guild user stat:", e);
                    resolve(false);
                });
        });
    };

    /**
     * Increase a bot stat by x
     * @param guild
     * @param user
     * @param stat
     * @param value
     * @returns {Promise<boolean>}
     */
    addDBGuildUserStat = async (guild: Discord.Guild, user: Discord.GuildMember, stat: string, value = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserStats
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id,
                        stat: stat,
                    } })
                .then(async (obj: DBGuildUserStats | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            val: obj.val + value,
                        });
                    }
 else {
                        // insert
                        await DBGuildUserStats.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            stat: stat,
                            val: value,
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error("Error while saving guild user stat:", e);
                    resolve(false);
                });
        });
    };

    /**
     * Increase a bot stat by x
     * @param guild
     * @param user
     * @param stat
     * @param value
     * @returns {Promise<boolean>}
     */
    subDBGuildUserStat = async (guild: Discord.Guild, user: Discord.GuildMember, stat: string, value = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserStats
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id,
                        stat: stat,
                    } })
                .then(async (obj: DBGuildUserStats | null) => {
                    if (obj) {
                        if ((obj.val - value) <= 0) value = 1;
                        else value = obj.val - value;

                        // update
                        await obj.update({
                            val: value,
                        });
                    }
 else {
                        // insert
                        await DBGuildUserStats.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            stat: stat,
                            val: value,
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error("Error while saving guild user stat:", e);
                    resolve(false);
                });
        });
    };

    /**
     * Increase a bot stat by x
     * @param guild
     * @param user
     * @param stat
     * @returns {Promise<boolean>}
     */
    deleteDBGuildUserStat = async (guild: Discord.Guild, user: Discord.GuildMember, stat: string): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserStats
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id,
                        stat: stat,
                    } })
                .then(async (obj: DBGuildUserStats | null) => {
                    if (obj) {
                        // update
                        await obj.destroy({
                            force: true,
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error("Error while saving guild user stat:", e);
                    resolve(false);
                });
        });
    };
}