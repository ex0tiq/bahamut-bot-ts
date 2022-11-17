import BahamutDBHandler, { DBGuildUserStats } from "../BahamutDBHandler";
import Discord from "discord.js";
import { Op, WhereOptions } from "sequelize";

export default class GuildUserStatHandler {
    // DB Handler instance
    private _dbHandler: BahamutDBHandler;

    constructor(dbHandler: BahamutDBHandler) {
        this._dbHandler = dbHandler;
    }

    getDBGuildUserStatsSUM = async (stats: string[], guild?: string | Discord.GuildMember): Promise<Map<string, number>> => {
        const resMap = new Map<string, number>;

        for (const val of stats) {
            const res: number | null = await new Promise((resolve) => {
                const where: WhereOptions = {
                    stat: val,
                };

                if (guild) {
                    where["guild_id"] = (typeof guild === "string" ? guild : guild.id);
                }

                return DBGuildUserStats
                    .sum("val", {
                        where: where,
                    })
                    .then(async (obj: number | null) => {
                        if (obj) resolve(obj);
                        else resolve(null);
                    }).catch(e => {
                        console.error("Error while querying guild user stat:", e);
                        resolve(null);
                    });
            });

            if (res) resMap.set(val, res);
        }

        return resMap;
    };

    /**
     * Get current guild users stats
     * @param guild
     * @param user
     * @param stats
     */
    getDBGuildUserStats = async (guild: Discord.Guild, user: Discord.GuildMember | null, stats?: string[]): Promise<Map<string, { val: number, updatedAt: Date }> | null> => {
        const where: WhereOptions = {
            guild_id: guild.id,
        };

        if (user) where["guild_user"] = user.user.id;
        if (stats && stats.length) {
            // @ts-ignore
            where[Op.or] = stats.map(e => {
                return {
                    stat: e,
                };
            });
        }

        const res: DBGuildUserStats[] | null = await new Promise((resolve) => {
            return DBGuildUserStats
                .findAll({
                    where: where,
                })
                .then(async (obj: DBGuildUserStats[] | null) => {
                    if (obj) resolve(obj);
                    else resolve(null);
                }).catch(e => {
                    console.error("Error while querying guild user stat:", e);
                    resolve(null);
                });
        });

        if (!res) return null;

        const resMap = new Map<string, { val: number, updatedAt: Date }>;
        for (const s of res) {
            resMap.set(s.stat, {
                val: s.val,
                updatedAt: s.updatedAt,
            });
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
                    } else {
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
                    } else {
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
    subDBGuildUserStat = async (guild: Discord.Guild, user: Discord.GuildMember, stat: string, value = 0): Promise<boolean> => {
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
                        if ((obj.val - value) < 0) value = 0;
                        else value = obj.val - value;

                        // update
                        await obj.update({
                            val: value,
                        });
                    } else {
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