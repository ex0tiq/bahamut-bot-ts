import Discord from "discord.js";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import { isUserModOfGuild } from "../../lib/checkFunctions";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";
import { resolveUser } from "../../lib/resolveFunctions";

const config: CommandConfig = {
    name: "undeafen",
    aliases: ["undeaf", "hear"],
    type: CommandType.LEGACY,
    description: "Undeafen a user.",
    minArgs: 1,
    expectedArgs: "<user>",
    options: [
        {
            name: "user",
            description: "The user to undeafen.",
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
                    { bitField: Discord.PermissionFlagsBits.DeafenMembers, name: "DEAFEN_MEMBERS" },
                ],
            },
        ]);
        if (await checks.runChecks()) return;

        if (!target) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `I am unable to find the user ${args[0]}.`);
        if (target.user.id === channel.guild.members.me!.id) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "I can't undeafen myself.");

        try {
            await target.voice.setDeaf(false, "Undeaf user command.");
        } catch (err) {
            console.error("Error while undeafening user:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while deafening the user. Please try again later.");
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "User undeafened", iconURL: client.bahamut.config.message_icons.success })
                    .setDescription(`User **${target.displayName}** has been undeafened! He can now hear again.`),
            ],
        });
    },
};