import BahamutClient from "../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "./getFunctions";
import { resolveRole, resolveUser } from "./resolveFunctions";

const isUserAdminOfGuild = async (client: BahamutClient, user: Discord.GuildMember | string, guild: Discord.Guild | undefined) => {
    if (!guild) return null;
    if (!client.guilds.cache.has(guild.id)) return null;

    guild = client.guilds.cache.get(guild.id);
    const settings = await getGuildSettings(client, guild), member = await resolveUser(client, user, guild);

    if (!member) return false;
    if (member?.permissions.has(Discord.PermissionFlagsBits.Administrator)) return true;

    for (const ro of settings.admin_roles) {
        const role = await resolveRole(client, ro, guild);
        if (role && role.members.size > 0 && role.members.has(member.id)) {
            return true;
        }
    }

    return false;
};

const isUserModOfGuild = async (client: BahamutClient, user: Discord.GuildMember | string, guild: Discord.Guild | undefined) => {
    if (!guild) return null;
    if (!client.guilds.cache.has(guild.id)) return null;

    guild = client.guilds.cache.get(guild.id);
    const settings = await getGuildSettings(client, guild), member = await resolveUser(client, user, guild);

    if (!member) return false;
    if (await isUserAdminOfGuild(client, user, guild)) return true;

    for (const ro of settings.mod_roles) {
        const role = await resolveRole(client, ro, guild);
        if (role && role.members.size > 0 && role.members.has(member.id)) {
            return true;
        }
    }

    return false;
};

export { isUserAdminOfGuild, isUserModOfGuild };