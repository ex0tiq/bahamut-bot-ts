import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import { resolveUser } from "../../lib/resolveFunctions";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers";
import BahamutClient from "../../modules/BahamutClient";
import { randomIntBetween } from "../../lib/toolFunctions";
import Discord from "discord.js";
import lang from "../../lib/languageMessageHandlers";

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

        try {
            const res = await client.bahamut.tenor.Search.Query("annoyed", "30");

            const rand = randomIntBetween(0, 29);
            const post = res.results[rand];

            if (target) {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setDescription(await lang.getMessage(client, channel.guild, "commands_emotes_annoyed_target_text", {
                                user1: member.toString(),
                                user2: target.toString(),
                            }) || "")
                            .setImage(post.media[0].gif.url)
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
                            .setImage(post.media[0].gif.url)
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