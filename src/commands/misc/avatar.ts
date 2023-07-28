import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { resolveUser } from "../../lib/resolveFunctions.js";
import { createMissingParamsErrorResponse, handleErrorResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "avatar",
    type: CommandType.BOTH,
    testOnly: false,
    description: "Get a users avatar.",
    minArgs: 0,
    expectedArgs: "[user]",
    options: [
        {
            name: "user",
            description: "Request avatar for this user.",
            type: ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    category: "Miscellaneous",
    guildOnly: true,
    deferReply: false,
};

export default {
    ...config,
    callback: async ({ client, channel, message, args, member, interaction }: { client: BahamutClient, channel: Discord.TextChannel, message: Discord.Message, args: any[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("miscellaneous")) return;

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

        return target?.user.displayAvatarURL();
    },
};