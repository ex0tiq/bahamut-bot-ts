import Discord from "discord.js";
import { CommandConfig } from "../../../../typings.js";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../../modules/BahamutClient.js";
import lang from "../../../lib/languageMessageHandlers.js";
import fs from "fs";
import { resolve } from "path";
import { getGuildSettings } from "../../../lib/getFunctions.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../../lib/messageHandlers.js";
import { toProperCase } from "../../../lib/toolFunctions.js";
// @ts-ignore
import XIVAPI from "@xivapi/js";

const allServers: string[] = (() => {
    const path = resolve("cache/ffxiv_servers.json");
    if (fs.existsSync(path)) {
        return JSON.parse(
            fs.readFileSync(path, "utf-8")
        );
    } else {
        return[];
    }
})();

const config: CommandConfig = {
    name: "link",
    type: CommandType.LEGACY,
    description: "Link your ffxiv character to your discord account.",
    minArgs: 2,
    expectedArgs: "<server> <character>",
    options: [
        {
            name: "server",
            description: "The FFXIV server you are playing on.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
        {
            name: "character-name",
            description: "Your In-game character name.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    category: "FFXIV (/ffxiv)",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: "ephemeral",
};

export default {
    ...config,
    autocomplete: () => {
        return allServers;
    },
    callback: async ({ client, message, channel, args, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        if ((message && args.length < 3) || (!message && args.length < 2)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));

        const xiv = new XIVAPI({
            private_key: client.bahamut.config.xivapi_token,
            language: settings.language,
        });
        let servers = [], response = null, char_achievements = null;

        try {
            servers = allServers.map((e) => {
                return e.toLowerCase();
            });
        } catch (err) {
            console.error("Error reading available FFXIV servers:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_generic") || "");
        }

        if (!servers.includes(args[0].toLowerCase())) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Invalid server provided. Please check server name and try again!");
        }

        try {
            response = await xiv.character.search(`${args.slice(1).join(" ")}`, {
                server: args[0],
            });
        } catch (err) {
            console.error("Error querying FFXIV character data:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_generic") || "");
        }
        if (response.Error) {
            console.error("Error querying FFXIV character data:", response.message);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_generic") || "");
        }

        if (response.Results.length >= 1) {
            try {
                await client.bahamut.dbHandler.ffxiv.saveDBGuildFFXIVCharacterID(channel.guild, member, response.Results[0].ID);
            } catch (err) {
                console.error("Error saving FFXIV character data to db:", err);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while saving your user. Please try again later.");
            }

            try {
                char_achievements = await xiv.character.get(response.Results[0].ID, {
                    data: "AC",
                });
            } catch (err) {
                console.error("Error querying FFXIV character achievements:", err);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while querying your user. Please try again later.");
            }
            if (char_achievements.Error) {
                console.error("Error querying FFXIV character achievements:", char_achievements.message);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_generic") || "");
            }

            char_achievements = char_achievements.Achievements.List.map((e: any) => {
                let i = null;

                if ((i = parseInt(e.ID))) {
                    return i;
                } else {
                    return null;
                }
            });

            const msg = new Discord.EmbedBuilder()
                .setAuthor({ "name": "Account linked", iconURL: client.bahamut.config.message_icons.success })
                .setThumbnail(response.Results[0].Avatar)
                .setDescription(`I've successfully saved your character, ${member}.`);

            try {
                let field = null;

                if (settings.character_verify_update_name) {
                    if (channel.guild.members.me!.permissions.has(Discord.PermissionFlagsBits.ManageNicknames)) {
                        try {
                            await member.setNickname(response.Results[0].Name, "Character verification");
                            field = `Your nickname on this server has been changed to \`${response.Results[0].Name}\``;
                        } catch (err: any) {
                            if (err.message.toLowerCase().includes("missing permissions")) {
                                field = "Your nickname couldn't be changed, because of missing permissions.\n\nPlease inform your server admin, to fix this issue.";
                            } else {
                                field = "An error occurred while updating your nickname. Please try again later.";
                            }
                        }
                    } else {
                        field = "Your nickname couldn't be changed, because of missing permissions.";
                    }

                    if (field) {
                        await msg.addFields({ name: "Nickname", value: field });
                    }
                }

                field = null;

                if (channel.guild.members.me!.permissions.has(Discord.PermissionFlagsBits.ManageRoles)) {
                    let roles = [];
                    if (settings.character_verify_roles.length > 0) {
                        try {
                            for (const g of settings.character_verify_roles) {
                                let role = null;
                                if ((role = channel.guild.roles.resolve(g))) {
                                    if (await member.roles.add(role)) {
                                        roles.push(role);
                                    }
                                }
                            }
                        } catch (err) {
                            console.error("Error updating FFXIV verify user groups:", err);
                            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while updating the user groups, please try again later.");
                        }
                    }
                    if (Object.keys(settings.character_verify_achievement_roles).length > 0) {
                        try {
                            for (const [achID, g] of Object.entries(settings.character_verify_achievement_roles)) {
                                if (char_achievements.includes(parseInt(achID))) {
                                    let role = null;
                                    if ((role = channel.guild.roles.resolve(g))) {
                                        if (await member.roles.add(role)) {
                                            roles.push(role);
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error("Error updating FFXIV verify achievement user groups:", err);
                            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while updating the user groups, please try again later.");
                        }
                    }

                    // Sort roles by name
                    roles = roles.sort((a, b) => a.name.localeCompare(b.name));

                    if (settings.character_verify_dc_role) {
                        try {
                            const dc = response.Results[0].Server.split(/\s+/g)[1].replace("(", "").replace(")", "").trim();
                            let role = channel.guild.roles.cache.find(r => r.name === dc);

                            if (role) {
                                if (await member.roles.add(role)) {
                                    roles.push(role);
                                }
                            } else if (settings.character_verify_dc_role_create) {
                                role = await channel.guild.roles.create({
                                    name: dc,
                                    reason: "Auto created dc role",
                                });

                                if (await member.roles.add(role)) {
                                    roles.push(role);
                                }
                            }
                        } catch (err) {
                            console.error("Error while updating the FFXIV user groups:", err);
                            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while updating the user groups, please try again later.");
                        }
                    }
                    if (settings.character_verify_server_role) {
                        try {
                            const srv = response.Results[0].Server.split(/\s+/g)[0].trim();
                            let role = channel.guild.roles.cache.find(r => r.name === srv);

                            if (role) {
                                if (await member.roles.add(role)) {
                                    roles.push(role);
                                }
                            } else if (settings.character_verify_server_role_create) {
                                role = await channel.guild.roles.create({
                                    name: srv,
                                    reason: "Auto created dc role",
                                });

                                if (await member.roles.add(role)) {
                                    roles.push(role);
                                }
                            }
                        } catch (err) {
                            console.error("Error while updating the FFXIV user groups:", err);
                            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while updating the user groups, please try again later.");
                        }
                    }
                    if (roles.length > 0) {
                        await msg.addFields({ name: "Roles added", value: roles.join(", ") });
                    }
                } else if (settings.character_verify_roles.length > 0 || Object.keys(settings.character_verify_achievement_roles).length > 0 || settings.character_verify_dc_role || settings.character_verify_server_role) {
                    await msg.addFields({ name: "Roles added", value: "Your roles couldn't be changed, because of missing permissions.\n\nPlease inform your server admin, to fix this issue." });
                }

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [msg],
                });
            } catch (err) {
                console.error("Error while linking FFXIV character:", err);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_generic") || "");
            }
        }
        return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `No characters found for \`${args.slice(1).join(" ")}\` on server \`${toProperCase(args[0])}\`.`);
    },
};