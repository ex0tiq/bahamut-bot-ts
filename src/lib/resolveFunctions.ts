import Discord from 'discord.js';
import BahamutClient from "../modules/BahamutClient.js";

/**
 * Resolve a guildmember. If not cached fetch from discord
 * @param client
 * @param user
 * @param guild
 * @param forceFetch
 * @returns {Promise<null|GuildMember>}
 */
const resolveUser = async (client: BahamutClient, user: Discord.GuildMember | string, guild: Discord.Guild | string | undefined, forceFetch = false) => {
    let usr: Discord.GuildMember | null = null;

    if (typeof guild === 'string') guild = client.guilds.cache.get(guild);
    if (!guild) return null;

    if (typeof user !== 'string') {
        return user;
    }

    try {
        if (forceFetch) return await guild.members.fetch({ user: user });
        if ((usr = guild.members.resolve(user)) || (usr = await guild.members.fetch({ user: user }))) {
            return usr;
        }
    }
    catch {
        return null;
    }

    return null;
};

/**
 * Resolve a guild role. If not cached fetch from discord
 * @param client
 * @param role
 * @param guild
 * @param forceFetch
 * @returns {Promise<null|*>}
 */
const resolveRole = async (client: BahamutClient, role: Discord.Role | string, guild: Discord.Guild | string | undefined, forceFetch= false) => {
    let rl: Discord.Role | null = null;

    if (typeof guild === 'string') guild = client.guilds.cache.get(guild);
    if (!guild) return null;

    try {
        if (forceFetch) return guild.roles.fetch((typeof role === 'string' ? role : role.id));
        if ((rl = guild.roles.resolve(role)) || (rl = await guild.roles.fetch((typeof role === 'string' ? role : role.id)))) {
            return rl;
        }
    }
    catch {
        return null;
    }

    return null;
};

/**
 * Resolve a guild channel. If not cached fetch from discord
 * @param client
 * @param channel
 * @param guild
 * @param forceFetch
 * @returns {Promise<null|*>}
 */
const resolveChannel = async (client: BahamutClient, channel: Discord.GuildBasedChannel | string, guild: Discord.Guild | string | undefined, forceFetch = false) => {
    let rl: Discord.GuildBasedChannel | null = null;

    if (typeof guild === 'string') guild = client.guilds.cache.get(guild);
    if (!guild) return null;

    try {
        if (forceFetch) return guild.channels.fetch((typeof channel === 'string' ? channel : channel.id));
        if ((rl = guild.channels.resolve(channel)) || (rl = await guild.channels.fetch((typeof channel === 'string' ? channel : channel.id)))) {
            return rl;
        }
    }
    catch {
        return null;
    }

    return null;
};

export { resolveUser, resolveRole, resolveChannel };