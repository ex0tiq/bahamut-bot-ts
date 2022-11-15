import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import { isUserModOfGuild } from "../../lib/checkFunctions";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";

const config: CommandConfig = {
    name: "slowmode",
    aliases: ["slow"],
    type: CommandType.LEGACY,
    description: "Activate or deactive slowmode in the current channel.",
    minArgs: 1,
    expectedArgs: "<seconds>",
    options: [
        {
            name: "seconds",
            description: "The seconds to wait between messages (set to 0 to disable).",
            required: true,
            autocomplete: true,
            type: Discord.ApplicationCommandOptionType.Integer,
            minValue: 0,
            maxValue: 21600,
        },
    ],
    category: "Moderation",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    autocomplete: () => {
        return ["Off"];
    },
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
                    { bitField: Discord.PermissionFlagsBits.ManageChannels, name: "MANAGE_CHANNELS" },
                ],
            },
        ]);
        if (await checks.runChecks()) return;

        let seconds = 0;
        if (args[0].toLowerCase() !== "off") seconds = parseInt(args[0]);

        try {
            await channel.setRateLimitPerUser(seconds, "Slowmode bot command");
        } catch (err) {
            console.error("Error while setting slowmode of channel:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while enabling slow mode for this channel. Please try again later.");
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "Slowmode", iconURL: client.bahamut.config.message_icons.success })
                    .setDescription(`Slowmode has been **${seconds === 0 ? "disabled" : "enabled"}** for this channel.`),
            ],
        });
    },
};