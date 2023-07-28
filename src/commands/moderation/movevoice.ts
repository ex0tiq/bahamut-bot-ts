import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import { resolveUser, resolveChannel } from "../../lib/resolveFunctions.js";
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
    name: "movevoice",
    aliases: ["mvvoice", "mvoice", "move", "mv"],
    type: CommandType.LEGACY,
    description: "Move a user from current voice connection to another.",
    minArgs: 2,
    expectedArgs: "<target> <channel>",
    options: [
        {
            name: "target",
            description: "The user to ban.",
            required: true,
            type: Discord.ApplicationCommandOptionType.User,
        },
        {
            name: "channel",
            description: "The channel to move the user to.",
            required: true,
            type: Discord.ApplicationCommandOptionType.Channel,
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
                    { bitField: Discord.PermissionFlagsBits.MoveMembers, name: "MOVE_MEMBERS" },
                ],
            },
        ]);
        if (await checks.runChecks()) return;

        if (!target) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `I am unable to find the user ${args[0]}.`);
        if (target.user.id === channel.guild.members.me!.id) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "I can't move myself to another voice channel.");
        if (!target.voice.channel) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This user is currently not connected to any voice channel.");

        const searchChannel = (args.slice(1).length > 0) ? args.slice(1).join(" ") : args.slice(1)[0],
            chan = await resolveChannel(client, searchChannel, channel.guild);

        if (!chan || (chan.type !== Discord.ChannelType.GuildVoice && chan.type !== Discord.ChannelType.GuildStageVoice)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `I cannot find a voice channel named \`${searchChannel}\`.`);

        try {
            await target.voice.setChannel(chan, "Voice channel move command.");
        } catch (err) {
            console.error("Error while moving user to voice channel:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while moving the user to another voice channel. Please try again later.");
        }

        return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `User **${target.displayName}** has been moved to voice channel **${chan}**!`);
    },
};