import BahamutDBHandler, {DBGuildUserLevels} from "../BahamutDBHandler.js";
import Discord from "discord.js";


export default class UserLevelDataHandler {
    // DB Handler instance
    private _dbHandler: BahamutDBHandler;

    constructor(dbHandler: BahamutDBHandler) {
        this._dbHandler = dbHandler;
    }


    /**
     * Get guild level data for user
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @returns {Promise<null|*>}
     */
    getDBGuildUserLevelData = async(guild: Discord.Guild, user: Discord.GuildMember): Promise<DBGuildUserLevels | null> => {
        return new Promise((resolve) => {
            return DBGuildUserLevels
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id
                    }})
                .then(async (obj: DBGuildUserLevels | null) => {
                    if (obj)  resolve(obj);
                    else resolve(null);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(null);
                });
        });
    }

    /**
     * Get guild level for user
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @returns {Promise<null|*>}
     */
    getDBGuildUserLevel = async(guild: Discord.Guild, user: Discord.GuildMember): Promise<number | null> => {
        const levelData = await this.getDBGuildUserLevelData(guild, user);

        if (levelData) return levelData.user_level;
        return null;
    }

    /**
     * Get guild level for user
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @returns {Promise<null|*>}
     */
    getDBGuildUserXp = async(guild: Discord.Guild, user: Discord.GuildMember): Promise<number | null> => {
        const levelData = await this.getDBGuildUserLevelData(guild, user);

        if (levelData) return levelData.user_xp;
        return null;
    }

    /**
     * Set guild level data for user
     * @param {Discord.Guild} guild
     * @param {Discord.User|string} user
     * @param {Number} xp
     * @param {Number} level
     * @returns {Promise<boolean>}
     */
    setDBGuildUserLevelData = async(guild: Discord.Guild, user: Discord.GuildMember, xp = 0, level = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserLevels
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id
                    }})
                .then(async (obj: DBGuildUserLevels | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            user_xp: xp,
                            user_level: level
                        });
                    } else {
                        // insert
                        await DBGuildUserLevels.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            user_xp: xp,
                            user_level: level
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(false);
                });
        });
    }

    /**
     * Set guild user level
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @param {Number} level
     * @returns {Promise<boolean>}
     */
    setDBGuildUserLevel = async(guild: Discord.Guild, user: Discord.GuildMember, level = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserLevels
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id
                    }})
                .then(async (obj: DBGuildUserLevels | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            user_level: level
                        });
                    } else {
                        // insert
                        await DBGuildUserLevels.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            user_xp: 0,
                            user_level: level
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(false);
                });
        });
    }

    /**
     * Set guild user xp
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @param {Number} xp
     * @returns {Promise<boolean>}
     */
    setDBGuildUserXP = async(guild: Discord.Guild, user: Discord.GuildMember, xp = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserLevels
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id
                    }})
                .then(async (obj: DBGuildUserLevels | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            user_xp: xp
                        });
                    } else {
                        // insert
                        await DBGuildUserLevels.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            user_xp: xp,
                            user_level: 1
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(false);
                });
        });
    }

    /**
     * Set guild user level
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @param level_to_add
     * @returns {Promise<boolean>}
     */
    addDBGuildUserLevel = async(guild: Discord.Guild, user: Discord.GuildMember, level_to_add = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserLevels
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id
                    }})
                .then(async (obj: DBGuildUserLevels | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            user_level: obj.user_level + level_to_add
                        });
                    } else {
                        // insert
                        await DBGuildUserLevels.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            user_xp: 0,
                            user_level: level_to_add
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(false);
                });
        });
    }

    /**
     * Set guild user level
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @param level_to_sub
     * @returns {Promise<boolean>}
     */
    subDBGuildUserLevel = async(guild: Discord.Guild, user: Discord.GuildMember, level_to_sub = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserLevels
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id
                    }})
                .then(async (obj: DBGuildUserLevels | null) => {
                    if (obj) {
                        if ((obj.user_level - level_to_sub) <= 0)  level_to_sub = 1;
                        else level_to_sub = obj.user_level - level_to_sub;

                        // update
                        await obj.update({
                            user_level: level_to_sub
                        });
                    } else {
                        // insert
                        await DBGuildUserLevels.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            user_xp: 0,
                            user_level: level_to_sub
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(false);
                });
        });
    }

    /**
     * Set guild user level
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @param xp_to_add
     * @returns {Promise<boolean>}
     */
    addDBGuildUserXP = async(guild: Discord.Guild, user: Discord.GuildMember, xp_to_add = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserLevels
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id
                    }})
                .then(async (obj: DBGuildUserLevels | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            user_xp: obj.user_level + xp_to_add
                        });
                    } else {
                        // insert
                        await DBGuildUserLevels.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            user_xp: xp_to_add,
                            user_level: 1
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(false);
                });
        });
    }

    /**
     * Set guild user level
     * @param {Discord.Guild|string} guild
     * @param {Discord.User|string} user
     * @param xp_to_sub
     * @returns {Promise<boolean>}
     */
    subDBGuildUserXP = async(guild: Discord.Guild, user: Discord.GuildMember, xp_to_sub = 1): Promise<boolean> => {
        return new Promise((resolve) => {
            return DBGuildUserLevels
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id
                    }})
                .then(async (obj: DBGuildUserLevels | null) => {
                    if (obj) {
                        if ((obj.user_level - xp_to_sub) <= 0)  xp_to_sub = 1;
                        else xp_to_sub = obj.user_xp - xp_to_sub;

                        // update
                        await obj.update({
                            user_level: xp_to_sub
                        });
                    } else {
                        // insert
                        await DBGuildUserLevels.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            user_xp: xp_to_sub,
                            user_level: 1
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild user stat:', e);
                    resolve(false);
                });
        });
    }

}