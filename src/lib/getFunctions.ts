import BahamutClient from "../modules/BahamutClient";
import Discord from "discord.js";
import {GuildSettings} from "../../typings";
import {resolveRole} from "./resolveFunctions";


const getGuildSettings = async (client: BahamutClient, guild: Discord.Guild | string | undefined, forceDb = false, resolveRoles = false, resolveChannels = false, adminRoles = false): Promise<GuildSettings> => {
    if (!guild) return client.bahamut.config.defaultSettings;
    let guildConf: GuildSettings | null | undefined;

    if (typeof guild === "string") guild = client.guilds.cache.get(guild);
    if (!guild) return client.bahamut.config.defaultSettings;

    if (forceDb) {
        guildConf = await client.bahamut.dbHandler.guildSettings.getDBGuildSettings(guild);
    }
    else {
        guildConf = (client.bahamut.settings.has(guild.id) ? client.bahamut.settings.get(guild.id) : null);
        if (!guildConf) guildConf = (await getGuildSettings(client, guild, true, resolveRoles, resolveChannels, adminRoles));
    }

    if (!guildConf) return client.bahamut.config.defaultSettings;

    if (resolveRoles) {
        let obj;
        if (Array.from(obj = guildConf.character_verify_achievement_roles.entries()).length > 0) {
            const tmp: Map<string, Discord.Role> = new Map<string, Discord.Role>;
            for (const [achievement, role] of obj) {
                const r = await resolveRole(client, role, guild);
                if (r) tmp.set(achievement, r);
            }
            guildConf.character_verify_achievement_roles = tmp;
        }
        if (Array.from(obj = guildConf.user_level_roles.entries()).length > 0) {
            const tmp: Map<number, Discord.Role> = new Map<number, Discord.Role>;
            for (const [level, role] of obj) {
                const r = await resolveRole(client, role, guild);
                if (r) tmp.set(level, r);
            }
            guildConf.user_level_roles = tmp;
        }

        if (adminRoles) {
            guildConf.admin_roles = [];
            guild.roles.cache.each((e) => {
                if (e.permissions.has(Discord.PermissionFlagsBits.Administrator)) guildConf?.admin_roles.push(e.id);
            });
        }
    }

    return guildConf;
}

export { getGuildSettings }