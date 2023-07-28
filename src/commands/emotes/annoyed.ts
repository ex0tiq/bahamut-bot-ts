import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import { resolveUser } from "../../lib/resolveFunctions.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { randomIntBetween } from "../../lib/toolFunctions.js";
import Discord from "discord.js";
import lang from "../../lib/languageMessageHandlers.js";

const config: CommandConfig = {
    name: "annoyed",
    aliases: ["annoy"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "You are annoyed [by user]",
    minArgs: 0,
    expectedArgs: "[user]",
    options: [
        {
            name: "user",
            description: "Optional user for emote.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    category: "Emotes",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: any[], interaction: Discord.CommandInteraction }) => {
        let target;

        if (args.length > 0) {
            if (message && message.mentions.members!.size > 0) {
                target = message.mentions.members?.first();
            } else if (!message && args.length > 0) {
                if (args[0] instanceof Discord.GuildMember) {
                    target = args[0];
                } else {
                    target = await resolveUser(client, args[0], channel.guild);
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }
        } else {
            target = member;
        }

        if (!target) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `I am unable to find the user ${args[0]}.`);

        try {
            const res = await client.bahamut.tenor.Search.Query("annoyed", "30");

            const rand = randomIntBetween(0, 29);
            const post = res[rand];

            if (target && target.id !== member.id) {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setDescription(await lang.getMessage(client, channel.guild, "commands_emotes_annoyed_target_text", {
                                user1: member.toString(),
                                user2: target.toString(),
                            }) || "")
                            .setImage(post.media_formats.gif.url || null)
                            .setFooter({ text: "Via Tenor" }),
                    ],
                });
            } else {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setDescription(await lang.getMessage(client, channel.guild, "commands_emotes_annoyed_text", {
                                user1: member.toString(),
                            }) || "")
                            .setImage(post.media_formats.gif.url || null)
                            .setFooter({ text: "Via Tenor" }),
                    ],
                });
            }
        } catch (ex) {
            console.error("Error fetching gif from Tenor:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_fetching_gif"));
        }
    },
};