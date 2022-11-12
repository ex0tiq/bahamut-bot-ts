import BahamutDBHandler, {DBGuildUserStats} from "../BahamutDBHandler";
import Discord from "discord.js";
import {Sequelize} from "sequelize";

export default class CookieHandler {
    // DB Handler instance
    private _dbHandler: BahamutDBHandler;

    constructor(dbHandler: BahamutDBHandler) {
        this._dbHandler = dbHandler;
    }


    /**
     * Set guild user cookie data
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @param {String|Number} cookies
     * @returns {Promise<boolean>}
     */
    setDBUserCookieData = async (guild: Discord.Guild, user: Discord.GuildMember, cookies = 0) => {
        return (await this._dbHandler.guildUserStat.setDBGuildUserStat(guild, user, "cookies", cookies));
    };

    /**
     * Add cookies to a user
     * @param guild
     * @param user
     * @param {Number} cookies
     */
    addDBCookiesToUser = async (guild: Discord.Guild, user: Discord.GuildMember, cookies = 0) => {
        return (await this._dbHandler.guildUserStat.addDBGuildUserStat(guild, user, "cookies", cookies));
    };

    /**
     * Sub cookies from a user
     * @param guild
     * @param user
     * @param {String|Number} cookies
     */
    subDBCookiesFromUser = async (guild: Discord.Guild, user: Discord.GuildMember, cookies = 0) => {
        return (await this._dbHandler.guildUserStat.subDBGuildUserStat(guild, user, "cookies", cookies));
    };

    /**
     * Get guild cookie data for user
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @returns {Promise<null|*>}
     */
    getDBUserCookies = async (guild: Discord.Guild, user: Discord.GuildMember) => {
        const userStats = await this._dbHandler.guildUserStat.getDBGuildUserStats(guild, user);
        if (!userStats) return null;

        const userCookies = userStats.filter(e => e.stat === "cookies").map(e => e.val);

        if (userCookies.length > 0) {
            return userStats[0].val;
        }

        return 0;
    };

    /**
     * Get guild user cookie rank
     * @param guild
     * @param user
     * @returns {Promise<null|string|Number>}
     */
    getDBGuildUserCookieRank = async (guild: Discord.Guild, user: Discord.GuildMember): Promise<number | null> => {
        return new Promise((resolve) => {
            return DBGuildUserStats
                .count({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id,
                        stat: "cookies"
                    }})
                .then(async (obj: number | null) => {
                    if (obj)  resolve(obj + 1);
                    else resolve(null);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(null);
                });
        });
    };

    /**
     * Get the guild cookie ranking
     * @param guild
     * @param limit
     * @param ascending
     * @returns {Promise<Array|Null>}
     */
    getDBGuildCookieRanking = async (guild: Discord.Guild, limit = 10, ascending = false) => {
        const res: DBGuildUserStats[] | null = await new Promise((resolve) => {
            return DBGuildUserStats
                .findAll({
                    attributes: [
                        "guild_user",
                        ["val", "cookies"],
                        [Sequelize.literal(`DENSE_RANK() OVER(ORDER BY CAST(val AS UNSIGNED)${ascending ? ' ASC' : ' DESC'})`), "rank"]
                    ],
                    where: {
                        guild_id: guild.id,
                        stat: "cookies"
                    },
                    limit: limit
                })
                .then(async (obj: DBGuildUserStats[] | null) => {
                    if (obj)  resolve(obj);
                    else resolve(null);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(null);
                });
        });

        if (!res || res.length <= 0) return null;

        const obj = [];
        for (const r of res) {
            obj.push({
                user: r.guild_user,
                // @ts-ignore
                cookies: r.cookies,
            });
        }

        return obj;
    };

    /**
     * Delete cookies for a user
     * @param guild
     * @param user
     * @returns {Promise<Boolean>}
     */
    deleteDBUserCookies = async (guild: Discord.Guild, user: Discord.GuildMember) => {
        return await this._dbHandler.guildUserStat.deleteDBGuildUserStat(guild, user, "cookies");
    };
}