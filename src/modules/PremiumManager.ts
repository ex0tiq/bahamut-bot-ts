import { getGuildSettings } from "../lib/getFunctions.js";
import Discord from "discord.js";
import { Bahamut } from "../bahamut.js";
import { resolveUser } from "../lib/resolveFunctions.js";
import { flattenArray } from "../lib/toolFunctions.js";
import { createErrorResponse, createSuccessResponse } from "../lib/messageHandlers.js";
import logger from "./Logger.js";
import { HandleMessageOptions } from "../../typings.js";
import BahamutClient from "./BahamutClient.js";

export default class PremiumManager {
    private readonly _bahamut: Bahamut;

    /**
     * Init premium manager
     * @param bahamut
     */
    constructor(bahamut: Bahamut) {
        this._bahamut = bahamut;
    }

    /**
     * If a guild has premium status
     * @param {Guild} guild
     */
    isGuildPremium = async (guild: Discord.Guild) => {
        const settings = await getGuildSettings(this._bahamut.client, guild);

        return !!(settings.premium_user && guild.members.cache.has(settings.premium_user));
    };

    /**
     * Function to handle user role updates
     * @param {Guild} guild
     * @param {GuildMember} oldUser
     * @param {GuildMember} newUser
     */
    handleUpdateUserRoles = async (guild: Discord.Guild, oldUser: Discord.GuildMember, newUser: Discord.GuildMember) => {
        if (!this._bahamut.config.premium_settings || !this._bahamut.config.premium_settings.management_guild) return;
        if (guild.id !== this._bahamut.config.premium_settings.management_guild) return;

        const roles_arr = Object.keys(this._bahamut.config.premium_settings.roles);
        let old_premium_role = null, new_premium_role = null, old_roles = [], new_roles = [];

        old_roles = oldUser.roles.cache.filter(e => e.id !== guild.roles.everyone.id).map(e => e.id);
        new_roles = newUser.roles.cache.filter(e => e.id !== guild.roles.everyone.id).map(e => e.id);

        for (const rl of old_roles) {
            if (roles_arr.includes(rl)) {
                old_premium_role = rl;
                break;
            }
        }
        for (const rl of new_roles) {
            if (roles_arr.includes(rl)) {
                new_premium_role = rl;
                break;
            }
        }

        // User changed premium level
        if (old_premium_role && new_premium_role && newUser.id !== this._bahamut.config.owner_id) {
            // If new role has fewer premium servers, disable premium for all user servers
            if (this._bahamut.config.premium_settings.roles[new_premium_role] < this._bahamut.config.premium_settings.roles[old_premium_role]) {
                // reset all user premium servers
                const user_srvs = await this.getUserPremiumServers(newUser);
                if (!user_srvs || user_srvs.length <= 0) return;

                for (const srv of user_srvs) {
                    let g;
                    if (this._bahamut.client.guilds.cache.has(srv.id) && (g = this._bahamut.client.guilds.cache.get(srv.id))) {
                        await this.disableGuildPremium(g, newUser);
                    }
                }
            }
        }
    };

    /**
     * Remove all premium settings for guild when deleted
     * @param guild
     * @returns {Promise<void>}
     */
    handleGuildDelete = async (guild: Discord.Guild) => {
        // Delete
        let data = (await this._bahamut.client.shard?.broadcastEval((_client: BahamutClient, obj) => {
            return _client.bahamut.premiumHandler.disablePremiumGuild(obj.guildId, null, true);
        }, { context: { guildId: guild.id } }));
        data = (Array.isArray(data) ? data.filter((e) => (e !== null)) : data);
        const resdata = (Array.isArray(data) && data.length === 1) ? data[0] : data;

        if (resdata !== true) {
            logger.error(this._bahamut.client.shardId, `Error while disabling premium status for deleted guild \`${guild.name}\``);
        }
    };

    /**
     * Remove premium settings if premium user leaves the guild
     * @param guild
     * @param member
     * @returns {Promise<void>}
     */
    handleGuildMemberRemove = async (guild: Discord.Guild, member: Discord.GuildMember) => {
        const settings = await getGuildSettings(this._bahamut.client, guild);
        if (settings.premium_user !== member.id) return;

        const premium_servers = (await this.getUserPremiumServers(member))?.map(e => e.id);
         if (!premium_servers?.includes(guild.id)) return;

        // Delete
        let data = (await this._bahamut.client.shard?.broadcastEval((_client: BahamutClient, obj) => {
            return _client.bahamut.premiumHandler.disablePremiumGuild(obj.guildId, obj.userId);
        }, { context: { guildId: guild.id, userId: member.user.id } }));
        data = (Array.isArray(data) ? data.filter((e) => (e !== null)) : data);
        const resdata = (Array.isArray(data) && data.length === 1) ? data[0] : data;

        if (resdata !== true) {
            logger.error(this._bahamut.client.shardId, `Error while disabling premium status for guild \`${guild.name}\`. Premium user ${member.displayName} left the guild.`);
        }
    };

    /**
     * Enable premium features for guild
     * @param guild
     * @param user
     * @returns {Promise<void>}
     */
    enableGuildPremium = async (guild: Discord.Guild, user: Discord.GuildMember): Promise<HandleMessageOptions> => {
        const slots = await this.getUserPremiumSlots(user),
            guild_settings = await getGuildSettings(this._bahamut.client, guild);

        if (slots["max"] === 0) {
            return createErrorResponse(this._bahamut.client, "You don't have unlocked any premium tiers. Please check our website for more information.");
        }
        if (guild_settings.premium_user === user.id) {
            return createErrorResponse(this._bahamut.client, "You have already unlocked premium features for this server.");
        }
        if (guild_settings.premium_user) {
            return createErrorResponse(this._bahamut.client, "Premium features are already unlocked for this server.");
        }
        if (slots["max"] >= 0 && (slots["current"] >= slots["max"] && user.id !== this._bahamut.config.owner_id)) {
            // Max count of premium servers reached for this role
            return createErrorResponse(this._bahamut.client, `You have reached the maximum amount of \`${slots["max"]}\` premium servers for your tier.\nPlease disable a server first to free premium slots.`);
        }

        let data = (await this._bahamut.client.shard?.broadcastEval((_client: BahamutClient, obj) => {
            return _client.bahamut.premiumHandler.enablePremiumGuild(obj.guildId, obj.userId);
        }, { context: { guildId: guild.id, userId: user.user.id } }));
        data = (Array.isArray(data) ? data.filter((e) => (e !== null)) : data);
        const resdata = (Array.isArray(data) && data.length === 1) ? data[0] : data;
        let embed;

        if (resdata === true) {
            // If current music leave timers -> abort
            if (this._bahamut.musicHandler.leaveTimers.has(guild.id)) {
                clearTimeout(this._bahamut.musicHandler.leaveTimers.get(guild.id));
                this._bahamut.musicHandler.leaveTimers.delete(guild.id);
            }

            embed = createSuccessResponse(this._bahamut.client, "Premium features have been enabled for this server.\nThank you very much for your support!");
        } else if (resdata === false) {
            embed = createErrorResponse(this._bahamut.client, "This server already has premium features unlocked by somebody else!");
        } else {
            embed = createErrorResponse(this._bahamut.client, "An unknown error has occurred while enabling premium features for this server!\nPlease contact our team for further help.");
        }

        return embed;
    };
    enablePremiumGuild = async (guild: Discord.Guild | string | undefined, user: string | null) => {
        if (!this._bahamut.client.guilds.cache.has(this._bahamut.config.premium_settings.management_guild)) return null;
        if (typeof guild === "string") guild = this._bahamut.client.guilds.cache.get(guild);
        if (!guild) return false;
        if (user !== null && !guild.members.cache.has(user)) return null;

        const settings = await getGuildSettings(this._bahamut.client, guild);
        if (settings.premium_user === user) return null;
        if (settings.premium_user !== null && settings.premium_user !== user) return false;

        await this._bahamut.dbHandler.guildSettings.setDBGuildSetting(guild, "premium_user", user);
        this._bahamut.settings.set(guild.id, await this._bahamut.dbHandler.guildSettings.getDBGuildSettings(guild));

        return true;
    };

    /**
     * Disable guild premium features with pre checks
     * @param guild
     * @param user
     * @returns {Promise<void>}
     */
    disableGuildPremium = async (guild: Discord.Guild, user: Discord.GuildMember): Promise<HandleMessageOptions> => {
        const premium_servers = (await this.getUserPremiumServers(user))!.map(e => e.id);

        if (!premium_servers || !premium_servers.includes(guild.id)) {
            return createErrorResponse(this._bahamut.client, "You did not unlock the premium features on this server and therefore cannot disable them.");
        }

        let data = (await this._bahamut.client.shard?.broadcastEval((_client: BahamutClient, obj) => {
            return _client.bahamut.premiumHandler.disablePremiumGuild(obj.guildId, obj.userId);
        }, { context: { guildId: guild.id, userId: user.user.id } }));
        data = (Array.isArray(data) ? data.filter((e) => (e !== null)) : data);
        const resdata = (Array.isArray(data) && data.length === 1) ? data[0] : data;
        let embed;

        if (resdata === true) {
            // Successfully disabled premium features
            embed = createSuccessResponse(this._bahamut.client, "Premium features have been disabled for this server.\nWe are sad to see you go :(");
        } else if (resdata === false) {
            // no premium
            embed = createErrorResponse(this._bahamut.client, "This server has no premium features enabled!");
        } else {
            // error
            embed = createErrorResponse(this._bahamut.client, "An unknown error has occurred while enabling premium features for this server!\nPlease contact our team for further help.");
        }

        return embed;
    };
    /**
     * Disable premium for guild
     * @param guild
     * @param user
     * @param force
     */
    disablePremiumGuild = async (guild: Discord.Guild | string | undefined, user: string | null, force = false) => {
        if (!this._bahamut.client.guilds.cache.has(this._bahamut.config.premium_settings.management_guild)) return null;
        if (typeof guild === "string") guild = this._bahamut.client.guilds.cache.get(guild);
        if (!guild) return false;
        if ((user !== null && !guild.members.cache.has(user)) && !force) return null;

        const settings = await getGuildSettings(this._bahamut.client, guild);
        if (settings.premium_user === null && !force) return false;

        try {
            await this._bahamut.dbHandler.guildSettings.deleteDBGuildSetting(guild, "premium_user");
            this._bahamut.settings.set(guild.id, await getGuildSettings(this._bahamut.client, guild));
            return true;
        } catch (ex) {
            console.error("Error while disabling premium for guild:", ex);
            return false;
        }
    };

    /**
     * Get max and current premium slots of user
     * @param {User} user
     * @returns {Promise<void>}
     */
    getUserPremiumSlots = async (user: Discord.GuildMember | string) => {
        return {
            "current": (await this.getUserPremiumServers(user))!.length || 0,
            "max": (await this.getUserMaxPremiumServers(user)),
        };
    };

    /**
     * Get all servers where a user has enabled premium features, combined from all shards
     * @param user
     */
    getUserPremiumServers = async (user: Discord.GuildMember | string): Promise<{id: string, name: string}[] | undefined> => {
        const data = (await this._bahamut.client.shard?.broadcastEval((_client: BahamutClient, obj) => {
            return _client.bahamut.premiumHandler.getUserPremiumGuilds(obj.userId);
        }, { context: { userId: (typeof user === "string" ? user : user.user.id) } }));
        return (Array.isArray(data) ? flattenArray(data.filter(e => (e !== null && e.length > 0))) : data);
    };

    /**
     * Get all premium guilds of a user
     * @param user
     */
    getUserPremiumGuilds = async (user: string): Promise<{ id: string, name: string }[]> => {
        const arr = [];
        for (const [id, g] of this._bahamut.client.guilds.cache.entries()) {
            const settings = await getGuildSettings(this._bahamut.client, g);
            if (settings.premium_user && settings.premium_user === user) {
                arr.push({
                    "id": "" + id,
                    "name": g.name,
                });
            }
        }

        return arr;
    };

    /**
     *
     * @param user
     * @returns {Promise<number>}
     */
    getUserMaxPremiumServers = async (user: Discord.GuildMember | string) => {
        let data = (await this._bahamut.client.shard?.broadcastEval((_client: BahamutClient, obj) => {
            return _client.bahamut.premiumHandler.getUserPremiumRole(obj.userId);
        }, { context: { userId: (typeof user === "string" ? user : user.user.id) } }));
        data = (Array.isArray(data) ? data.filter((e) => e !== null) : data);
        const resdata = (Array.isArray(data) && data.length >= 1 ? data[0] : null);

        if (!resdata) return 0;
        if (resdata === -1) return -1;
        if (!Object.keys(this._bahamut.config.premium_settings.roles).includes(resdata.id)) return 0;
        return this._bahamut.config.premium_settings.roles[resdata.id];
    };

    /**
     * Get current premium role of user
     * @param user
     * @returns {Promise<unknown|number>}
     */
    getUserPremiumRole = async (user: Discord.GuildMember | string): Promise<{id: string, name: string} | null | -1> => {
        if (!this._bahamut.client.guilds.cache.has(this._bahamut.config.premium_settings.management_guild)) return null;

        const guild = this._bahamut.client.guilds.cache.get(this._bahamut.config.premium_settings.management_guild),
            usr = await resolveUser(this._bahamut.client, user, guild);

        if (!guild || !usr) return null;
        if (usr.id === this._bahamut.config.owner_id) return -1;

        const roles_arr = Object.keys(this._bahamut.config.premium_settings.roles);
        for (const [key, rl] of usr.roles.cache.filter((e: { id: string; rawPosition: number; }) => (e.id !== guild.roles.everyone.id && e.rawPosition !== 0)).sort((e1: any, e2: any) => e2.rawPosition - e1.rawPosition)) {
            if (roles_arr.includes(key)) {
                return {
                    "id": "" + key,
                    "name": rl.name,
                };
            }
        }

        return null;
    };

    /**
     *
     * @param customMessage
     */
    getGuildNotPremiumMessage = (customMessage: string | null = null) => {
        return createErrorResponse(this._bahamut.client, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setTitle(`<:heart:${this._bahamut.config.status_emojis.heart}> Premium`)
                    .setDescription((customMessage ? customMessage : `This features requires an active premium subscription.\nIf you want to know more about this, please check out our [website](${this._bahamut.config.website_link}).`)),
            ],
        });
    };
}