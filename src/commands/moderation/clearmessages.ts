import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { isUserModOfGuild } from "../../lib/checkFunctions.js";
import {
    handleErrorResponseToMessage,
} from "../../lib/messageHandlers.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";

const config: CommandConfig = {
    name: "clearmessages",
    aliases: ["clear", "cls"],
    type: CommandType.LEGACY,
    description: "Clear N amounts of messages from the current channel (max. 200 in one go).",
    minArgs: 1,
    expectedArgs: "<amount>",
    options: [
        {
            name: "amount",
            description: "The amount of messages to clear.",
            type: Discord.ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 1,
            maxValue: 200,
        },
    ],
    category: "Moderation",
    guildOnly: true,
    testOnly: false,
    deferReply: "ephemeral",
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("moderation")) return;

        if (!await isUserModOfGuild(client, member, channel.guild)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You do not have the permissions to execute this command.");

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
                    { bitField: Discord.PermissionFlagsBits.ManageMessages, name: "MANAGE_MESSAGES" },
                ],
            },
        ]);
        if (await checks.runChecks()) return;

        let count = 0;
        if (!(count = parseInt(args[0])) || count > 200) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Max. 200 messages can be cleared in one go, please run command multiple times if you wanna clear more.");
        if (count <= 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Message count has be greater than 0!");

        try {
            await channel.bulkDelete(count);
        } catch (err) {
            console.error("Error clearing messages:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while deleting messages. Please try again later.");
        }
    },
};