import { removeLevelRole } from "../lib/command_handler/config/tools/levelRolesFunctions";
import { Bahamut } from "../bahamut";
import { LevelConfig } from "../../typings";
import Discord from "discord.js";
import { getGuildSettings } from "../lib/getFunctions";
import {
    handleErrorResponseToMessage,
    handleResponseToMessage,
    handleSuccessResponseToMessage,
} from "../lib/messageHandlers";
const { getXpForLevel } = require("../lib/levelFunctions");

export default class LevelSystem {
    // Bahamut instance
    private _bahamut: Bahamut;
    // Load level config
    private _levelConfig: LevelConfig = require("../../assets/level_config.json");
    // Cache for all guild user level data
    private _guildUserLevelDataCache: {
        [guild: string]: {
            [member: string]: {
                guild_id: string;
                guild_user: string;
                user_level: number;
                user_xp: number;
            }
        }
    } = {};

    constructor(bahamut: Bahamut) {
        this._bahamut = bahamut;
    }

    public get levelConfig() {
        return this._levelConfig;
    }
    public get guildUserLevelDataCache() {
        return this._guildUserLevelDataCache;
    }

    handleNewUserMessage = async (message: Discord.Message, user: Discord.GuildMember) => {
        if (!message.guild) return;

        const settings = await getGuildSettings(this._bahamut.client, message.guild.id);

        // Abort if user module is disabled
        if (settings.disabled_categories.includes("users")) return;
        // Abort if user levels are disabled
        if (!settings.user_levels) return;
        // Abort if included channels are activated and current channel is not one of them
        if (settings.user_level_included_channels.length > 0 && !settings.user_level_included_channels.includes(message.channel.id)) return;

        let new_xp = 0, new_level = 1, new_role: Discord.Role | boolean | null = null, guildLevelData = null, cookiesAdded = false;
        const removed_roles = [], message_length_multiplier = message.content.split(" ").length, user_levels = (Object.entries(this._levelConfig.levels).sort(([l1], [l2]) => parseInt(l1) - parseInt(l2)));

        if (typeof this._guildUserLevelDataCache[message.guild.id] === "undefined" || ((typeof this._guildUserLevelDataCache[message.guild.id] !== "undefined") && (typeof this._guildUserLevelDataCache[message.guild.id][message.author.id] === "undefined"))) {
            guildLevelData = await this._bahamut.dbHandler.userLevelData.getDBGuildUserLevelData(message.guild, user);

            if (typeof this._guildUserLevelDataCache[message.guild.id] === "undefined") this._guildUserLevelDataCache[message.guild.id] = {};
            if (guildLevelData) this._guildUserLevelDataCache[message.guild.id][message.author.id] = guildLevelData;
            else {
                this._guildUserLevelDataCache[message.guild.id][message.author.id] = {
                    guild_id: message.guild.id,
                    guild_user: (user ? user.id : message.author.id),
                    user_level: 1,
                    user_xp: 0,
                };
            }
        } else {
            guildLevelData = this._guildUserLevelDataCache[message.guild.id][message.author.id];
        }

        const lvl = (guildLevelData ? guildLevelData.user_level : 1),
            xp = (guildLevelData ? guildLevelData.user_xp : 0);

        if (lvl >= parseInt(user_levels[user_levels.length - 1][0])) return;

        if (lvl <= 30) {
            new_xp = (xp + this._levelConfig.xp_per_message_very_low) + ((message_length_multiplier * 0.25) < 1 ? 1 : (message_length_multiplier * 0.25));
        } else if (lvl <= 60) {
            new_xp = (xp + this._levelConfig.xp_per_message_low) + ((message_length_multiplier * 0.3) < 1 ? 1 : (message_length_multiplier * 0.3));
        } else if (lvl <= 90) {
            new_xp = (xp + this._levelConfig.xp_per_message_mid) + ((message_length_multiplier * 0.35) < 1 ? 1 : (message_length_multiplier * 0.35));
        } else if (lvl <= 120) {
            new_xp = (xp + this._levelConfig.xp_per_message_high) + ((message_length_multiplier * 0.4) < 1 ? 1 : (message_length_multiplier * 0.4));
        } else {
            new_xp = (xp + this._levelConfig.xp_per_message_very_high) + ((message_length_multiplier * 0.5) < 1 ? 1 : (message_length_multiplier * 0.5));
        }
        new_xp = Math.round(new_xp);

        if (typeof user_levels[lvl][0] !== "undefined" && new_xp >= user_levels[lvl][1]) {
            new_level = lvl + 1;
        }

        // if new level is greater than previous level
        if (new_level > lvl) {
            const level_xp = getXpForLevel(this._bahamut.client, (lvl + 1)), overflow_xp = new_xp - level_xp;
            if (overflow_xp > 0) {
                new_xp = overflow_xp;
            } else {
                new_xp = 0;
            }

            // Save to DB
            if (await this._bahamut.dbHandler.userLevelData.setDBGuildUserLevelData(message.guild, (user ? user : message.member!), new_xp, new_level)) {
                this._guildUserLevelDataCache[message.guild.id][message.author.id].user_xp = 0;
                this._guildUserLevelDataCache[message.guild.id][message.author.id].user_level = new_level;

                const roles = Object.entries(settings.user_level_roles);
                if (roles.length > 0) {
                    if (new_level && settings.user_level_roles.has(new_level)) {
                        let role = null;
                        if ((role = message.guild.roles.resolve(settings.user_level_roles.get(new_level)!))) {
                            if (await user.roles.add(role)) {
                                new_role = role;
                            } else {
                                new_role = false;
                            }
                        } else {
                            // Remove non existent level role
                            await removeLevelRole(this._bahamut.client, message.guild, new_level);
                        }
                    }
                }

                // If new role is set and role change mode is set to replace, remove all other level roles
                if (new_role && settings.user_level_roles.has(new_level) && settings.user_level_roles_replace) {
                    for (const [, snowflake] of roles) {
                        if (snowflake !== new_role && user.roles.cache.has(snowflake)) {
                            if (await user.roles.remove(snowflake)) {
                                removed_roles.push(user.roles.cache.get(snowflake));
                            }
                        }
                    }
                }

                // On level up, add cookies to user account
                let cookies = 0;
                if (new_level <= 50) {
                    cookies = 50;
                } else if (new_level <= 80) {
                    cookies = 75;
                } else if (new_level <= 120) {
                    cookies = 100;
                } else {
                    cookies = 150;
                }

                if (await this._bahamut.dbHandler.cookie.addDBCookiesToUser(message.guild, (user ? user : message.member!), cookies)) {
                    cookiesAdded = true;
                }

                if (new_level >= parseInt(user_levels[user_levels.length - 1][0])) {
                    await handleSuccessResponseToMessage(
                        this._bahamut.client,
                        message,
                        false,
                        true,
                        {
                            embeds: [
                                this.getLevelUpMessage(user, new_level, level_xp, new_xp, new_role, removed_roles, true, (cookiesAdded ? cookies : null)),
                            ],
                        }
                    );

                    await handleResponseToMessage(this._bahamut.client, message, false, true, {
                        embeds: [this.getLevelUpMessage(user, new_level, level_xp, new_xp, new_role, removed_roles, true, (cookiesAdded ? cookies : null))],
                    });
                    return;
                } else {
                    await handleResponseToMessage(this._bahamut.client, message, false, true, {
                        embeds: [this.getLevelUpMessage(user, new_level, level_xp, new_xp, new_role, removed_roles, false, (cookiesAdded ? cookies : null))],
                    });
                    return;
                }
            }
        } else {
            // if new level is not greater than previous level, update xp
            // eslint-disable-next-line no-lonely-if
            if (await this._bahamut.dbHandler.userLevelData.setDBGuildUserLevelData(message.guild, (user ? user : message.member!), new_xp, lvl)) {
                this._guildUserLevelDataCache[message.guild.id][message.author.id].user_xp = new_xp;
            } else {
                return handleErrorResponseToMessage(this._bahamut.client, message, false, true, "Error while saving the user xp. Please try again later.");
            }
        }
    };

    /**
     * Get level up message embed
     * @param {module:"discord.js".User} user
     * @param {Number} new_level
     * @param {Number} level_xp
     * @param {Number} new_xp
     * @param {Discord.Role|null|Boolean} new_role
     * @param {Array} removed_roles
     * @param {Boolean} max
     * @param {Number|null} cookies
     */
    getLevelUpMessage = (user: Discord.GuildMember, new_level: number, level_xp: number, new_xp: number, new_role: Discord.Role | boolean | null, removed_roles: (Discord.Role | undefined)[], max = false, cookies: number | null = null) => {
        let newMsg;
        if (max) {
            newMsg = new Discord.EmbedBuilder()
                        .setAuthor({ name: "Max level reached!", iconURL: this._bahamut.config.level_up_images.max_icon })
                        .setDescription(`Congratulations, ${user}! You have reached the max level **${new_level}**!\n\nWhat are you going to do now?`)
                        .setImage(this._bahamut.config.level_up_images.banner)
                        .setThumbnail(user.avatarURL() || user.user.avatarURL() || user.user.defaultAvatarURL);
        } else {
            newMsg = new Discord.EmbedBuilder()
                        .setAuthor({ name: "Level Up!", iconURL: this._bahamut.config.level_up_images.icon })
                        .setDescription(`Congratulations, ${user}! You have reached the next level **${new_level}**!`)
                        .setImage(this._bahamut.config.level_up_images.banner)
                        .setThumbnail(user.avatarURL() || user.user.avatarURL() || user.user.defaultAvatarURL);
        }

        if (new_role) {
            // @ts-ignore
            newMsg.addFields({ name: "New Role", value: new_role, inline: true });
        } else if (!new_role && new_role !== null) {
            newMsg.addFields({ name: "New Role", value: "New role couldn't be assigned, because of missing permissions!", inline: true });
        }
        if (removed_roles.length > 0) {
            newMsg.addFields({ name: "Removed Role(s)", value: removed_roles.join(", "), inline: true });
        }
        if (cookies) {
            // eslint-disable-next-line
            newMsg.addFields({ name: "Cookies", value: `${cookies} \:cookie: Cookies have been added to your account!` });
        }

        return newMsg;
    };
}