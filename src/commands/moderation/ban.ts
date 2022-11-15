import { resolveUser } from "../../lib/resolveFunctions";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import { getGuildSettings } from "../../lib/getFunctions";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { isUserModOfGuild } from "../../lib/checkFunctions";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";

const config: CommandConfig = {
    name: "ban",
    type: CommandType.LEGACY,
    description: "Ban a user.",
    minArgs: 1,
    expectedArgs: "<target> [reason]",
    options: [
        {
            name: "target",
            description: "The user to ban.",
            required: true,
            type: Discord.ApplicationCommandOptionType.User,
        },
        {
            name: "reason",
            description: "Reason for the ban.",
            required: false,
            type: Discord.ApplicationCommandOptionType.String,
        },
    ],
    category: "Moderation",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("moderation")) return;

        if (!await isUserModOfGuild(client, member, channel.guild)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You do not have the permissions to execute this command.");

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
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
        }

        const checks = new BahamutCommandPreChecker(client, {
            client,
            message,
            channel,
            args,
            member,
            interaction,
        }, config, [
            {
                type: PreCheckType.BOT_HAS_PERMISSIONS, requiredPermissions: [
                    { bitField: Discord.PermissionFlagsBits.BanMembers, name: "BAN_MEMBERS" },
                ],
            },
        ]);
        if (await checks.runChecks()) return;

        if (!target) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `I am unable to find the user ${args[0]}.`);
        if (target.user.id === channel.guild.members.me!.id) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "I can't ban myself.");
        if (member.user.id === target.user.id) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You cannot ban yourself.");
        if (!target.bannable) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "I am unable to ban that user. Please check that I have the correct permissions.");

        try {
            if (args.length > 1) {
                await target.ban({ reason: args.shift().join(" ") });
            } else {
                await target.ban();
            }
        } catch (err) {
            console.error("Error while banning user:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while banning the user. Please try again later.");
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "User banned", iconURL: client.bahamut.config.message_icons.success })
                    .setDescription(`User **${target.displayName}** has been banned from the server!`),
            ],
        });
    },
};