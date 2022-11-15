import { CommandConfig } from "../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { isUserModOfGuild } from "../../lib/checkFunctions";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";
import { getGuildSettings } from "../../lib/getFunctions";

const config: CommandConfig = {
    name: "settopic",
    aliases: ["topic"],
    type: CommandType.LEGACY,
    description: "Set the topic of the current channel (off/none will remove any topic).",
    minArgs: 1,
    expectedArgs: "<topic>",
    options: [
        {
            name: "topic",
            description: "The new topic (set to off/none to clear existing)",
            required: true,
            autocomplete: true,
            type: Discord.ApplicationCommandOptionType.String,
        },
    ],
    category: "Moderation",
    cooldowns: {
        type: CooldownTypes.perGuild,
        duration: "10 m",
    },
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

        try {
            if (["none", "off"].includes(args[0].toLowerCase())) {
                await channel.setTopic("", "Set topic bot command");

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setAuthor({ name: "Topic", iconURL: client.bahamut.config.message_icons.success })
                            .setDescription("The topic of this channel has been set to **None**."),
                    ],
                });
            } else {
                await channel.setTopic(args.join(" "), "Set topic bot command");

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setAuthor({ name: "Topic", iconURL: client.bahamut.config.message_icons.success })
                            .setDescription(`The topic of this channel has been set to **${args.join(" ")}**.`),
                    ],
                });
            }
        } catch (err) {
            console.error("Error while setting channel topic:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while setting the topic for this channel. Please try again later.");
        }
    },
};