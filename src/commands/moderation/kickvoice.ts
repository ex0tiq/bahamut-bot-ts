import Discord from "discord.js";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import { resolveUser } from "../../lib/resolveFunctions";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import { isUserModOfGuild } from "../../lib/checkFunctions";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";

const config: CommandConfig = {
    name: "kickvoice",
    aliases: ["kvoice"],
    type: CommandType.LEGACY,
    description: "Kick a user from voice connection.",
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
    testOnly: true,
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
                    { bitField: Discord.PermissionFlagsBits.MoveMembers, name: "MOVE_MEMBERS" },
                ],
            },
        ]);
        if (await checks.runChecks()) return;

        if (!target) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `I am unable to find the user ${args[0]}.`);
        if (target.user.id === channel.guild.members.me!.id) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "I can't kick myself from voice.");
        if (!target.voice.channel) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This user is currently not connected to any voice channel.");

        try {
            if (args.length > 1) {
                await target.voice.disconnect(args.slice(1).join(" "));
            } else {
                await target.voice.disconnect();
            }
        } catch (err) {
            console.error("Error while kicking user from voice:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while kicking the user from voice. Please try again later.");
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "User kicked", iconURL: client.bahamut.config.message_icons.success })
                    .setDescription(`User **${target.displayName}** was kicked from voice connection!`),
            ],
        });
    },
};