import BahamutClient from "../../../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../../getFunctions.js";

/**
 * Add a level role to db
 * @param client
 * @param guild
 * @param level
 * @param role
 * @returns {Promise<null|boolean|*>}
 */
const addLevelRole = async (client: BahamutClient, guild: Discord.Guild, level: string, role: Discord.Role) => {
    const settings = await getGuildSettings(client, guild.id);

    const groups = settings.user_level_roles;

    if (typeof groups.get(parseInt(level)) === "undefined") {
        groups.set(parseInt(level), role);
    }
    else {
        return false;
    }

    if (await client.bahamut.dbHandler.guildSettings.setDBGuildSetting(guild, "user_level_roles", JSON.stringify(groups))) {
        return true;
    }
    else {
        return null;
    }
};

/**
 * Remove a level from db
 * @param client
 * @param guild
 * @param level
 * @returns {Promise<null|boolean|Holds>}
 */
const removeLevelRole = async (client: BahamutClient, guild: Discord.Guild, level: number) => {
    const settings = await getGuildSettings(client, guild.id);

    const groups = settings.user_level_roles;
    let role = null;

    if (groups.has(level)) {
        role = guild.roles.resolve(groups.get(level)!);
        groups.delete(level);
    }
    else {
        return false;
    }

    if (await client.bahamut.dbHandler.guildSettings.setDBGuildSetting(guild, "user_level_roles", JSON.stringify(groups))) {
        return role;
    }
    else {
        return null;
    }
};

export { addLevelRole, removeLevelRole };