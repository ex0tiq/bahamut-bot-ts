import BahamutClient from "../modules/BahamutClient";
import Discord from "discord.js";

/**
 * Get the current level and xp of a user
 * @param {Client} client
 * @param {User} user
 * @param {Boolean} userStats
 * @returns {Promise<Object>}
 */
const getCurrentUserData = async(client: BahamutClient, user: Discord.GuildMember, userStats = false) => {
    let guildLevelData = null;

    if (typeof client.bahamut.levelSystem.guildUserLevelDataCache[user.guild.id] === 'undefined' || ((typeof client.bahamut.levelSystem.guildUserLevelDataCache[user.guild.id] !== 'undefined') && (typeof client.bahamut.levelSystem.guildUserLevelDataCache[user.guild.id][user.id] === 'undefined'))) {
        guildLevelData = await client.bahamut.dbHandler.userLevelData.getDBGuildUserLevelData(user.guild, user);

        if (typeof client.bahamut.levelSystem.guildUserLevelDataCache[user.guild.id] === 'undefined') {
            client.bahamut.levelSystem.guildUserLevelDataCache[user.guild.id] = {};
        }
        client.bahamut.levelSystem.guildUserLevelDataCache[user.guild.id][user.id] = {
            guild_id: (guildLevelData ? guildLevelData.guild_id : user.guild.id),
            guild_user: (guildLevelData ? guildLevelData.guild_user : user.id),
            user_level: (guildLevelData ? guildLevelData.user_level : 1),
            user_xp: (guildLevelData ? guildLevelData.user_xp : 0)
        };
    }
    else {
        guildLevelData = client.bahamut.levelSystem.guildUserLevelDataCache[user.guild.id][user.id];
    }

    return {
        level : (guildLevelData ? guildLevelData.user_level : 1),
        xp : (guildLevelData ? guildLevelData.user_xp : 0),
        exists : (!!guildLevelData),
    };
}

/**
 * Calculate xp left to next level
 * @param client
 * @param cur_level
 * @param cur_xp
 */
async function getXpToNextLevel(client: BahamutClient, cur_level: number, cur_xp: number) {
    if (typeof (client.bahamut.levelSystem.levelConfig.levels[`${cur_level + 1}`]) !== 'undefined') {
        return (client.bahamut.levelSystem.levelConfig.levels[`${cur_level + 1}`] - cur_xp);
    }
    else {
        return 0;
    }
}

/**
 * Calculate xp for level
 * @param client
 * @param level
 * @returns {null|number}
 */
async function getXpForLevel(client: BahamutClient, level: number) {
    if (typeof (client.bahamut.levelSystem.levelConfig.levels[`${level}`]) !== 'undefined') {
        return (client.bahamut.levelSystem.levelConfig.levels[`${level}`]);
    }
    else {
        return 0;
    }
}

export {
    getXpForLevel,
    getXpToNextLevel,
    getCurrentUserData,
};