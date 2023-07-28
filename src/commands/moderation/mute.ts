import { resolveUser } from "../../lib/resolveFunctions.js";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { isUserModOfGuild } from "../../lib/checkFunctions.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleSuccessResponseToMessage,
} from "../../lib/messageHandlers.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";

const config: CommandConfig = {
    name: "mute",
    type: CommandType.LEGACY,
    description: "Mute a user server wide.",
    minArgs: 1,
    expectedArgs: "<target>",
    options: [
        {
            name: "target",
            description: "The user to mute.",
            required: true,
            type: Discord.ApplicationCommandOptionType.User,
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
                    { bitField: Discord.PermissionFlagsBits.MuteMembers, name: "MUTE_MEMBERS" },
                ],
            },
        ]);
        if (await checks.runChecks()) return;

        if (!target) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `I am unable to find the user ${args[0]}.`);
        if (target.user.id === channel.guild.members.me!.id) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "I can't mute myself.");

        try {
            await target.voice.setMute(true, "Mute user command.");
        } catch (err) {
            console.error("Error while muting user:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while muting the user. Please try again later.");
        }

        return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `User **${target.displayName}** has been muted!`);
    },
};