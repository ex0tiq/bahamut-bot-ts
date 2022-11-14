import { CommandConfig } from "../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "news",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get the latest lodestone news.",
    category: "FFXIV",
    guildOnly: true,
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        const data = (await client.shard!.broadcastEval(async (_client: BahamutClient) => {
            if (!_client.channels.cache.has(_client.bahamut.config.ffxiv_settings.lodestone_source_channel)) return null;

            const ch = _client.channels.cache.get(_client.bahamut.config.ffxiv_settings.lodestone_source_channel) as Discord.TextChannel,
                messages = await ch.messages.fetch({ limit: 5 }),
                messagesArr = [...messages.values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp).filter((e) => e.embeds && e.embeds.length > 0);

            if (!messages) return null;
            return {
                id: messagesArr[0].id,
                embed: messagesArr[0].embeds[0],
            };
        })).filter(e => e !== null);

        let dataEmbed: { id: string, embed: Discord.APIEmbed } | null = null;

        if (Array.isArray(data)) dataEmbed = data[0];

        // If message does not contain any embeds, abort
        if (!dataEmbed) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while fetching the latest lodestone news.");

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            // @ts-ignore
            embeds: [dataEmbed.embed],
        });
    },
};