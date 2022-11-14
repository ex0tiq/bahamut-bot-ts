import { CommandConfig } from "../../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../../modules/BahamutClient";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../../lib/messageHandlers";
import { isInt } from "../../../lib/validateFunctions";
import { resolveUser } from "../../../lib/resolveFunctions";

const config: CommandConfig = {
    name: "givecookies",
    aliases: ["pay"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Give another user an amount of your cookies.",
    minArgs: 2,
    expectedArgs: "<user> <amount>",
    options: [
        {
            name: "user",
            description: "User to give cookies to.",
            type: Discord.ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "amount",
            description: "Amount of cookies to transfer.",
            type: Discord.ApplicationCommandOptionType.Number,
            required: true,
        },
    ],
    category: "Fun",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        if (!isInt(args[1]) || (parseInt(args[1]) <= 0)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "No valid cookie amount provided. Please use only full numbers larger than 0 as second parameter!");

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
        }

        if (!target) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "No user to transfer cookies to found!");

        try {
            const amount = parseInt(args[1]);

            if (member.id === target.id) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You can't give cookies to yourself!");
            if (target.user.bot) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You can't give cookies to a bot!");

            const authorStats = await client.bahamut.dbHandler.cookie.getDBUserCookies(channel.guild, member);

            if (authorStats) {
                if (amount > authorStats) {
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `You only own **${authorStats}** cookies! You can't give more than that!`);
                }
                // const userStats = await getUserCookies(client, message, message.guild, user);

                if ((await client.bahamut.dbHandler.cookie.subDBCookiesFromUser(channel.guild, member, amount)) && (await client.bahamut.dbHandler.cookie.addDBCookiesToUser(channel.guild, target, amount))) {
                    return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setAuthor({ name: "Cookies transfered", iconURL: client.bahamut.config.cookie_images.icon })
                                .setDescription(`${member}, you gave **${amount}** cookies to ${target}!`),
                        ],
                    });
                } else {
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while transferring your cookies. Please try again later.");
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You do not own any cookies yet!");
            }
        } catch (ex) {
            console.error("Error while transfering cookies:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
        }
    },
};