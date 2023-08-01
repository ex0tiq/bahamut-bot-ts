import snoowrap from "snoowrap";
import { CommandConfig } from "../../../typings.js";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord, { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "fashionreport",
    type: CommandType.LEGACY,
    description: "Get the latest fashion report.",
    category: "FFXIV (/ffxiv)",
    guildOnly: true,
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        const reddit = new snoowrap({
                userAgent: client.bahamut.config.reddit.userAgent,
                clientId: client.bahamut.config.reddit.appid,
                clientSecret: client.bahamut.config.reddit.secret,
                refreshToken: client.bahamut.config.reddit.refreshToken,
            }),
            res = await reddit.getSubreddit("ffxiv").search({
                query: "author:kaiyoko title:Fashion Report - Full Details",
                sort: "new",
            });

        if (!res || !Array.isArray(res) || res.length <= 0 || (!res[0].title.toLowerCase().match(/.*fashion.*report.*full.*details.*/g))) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while fetching the latest fashion report. Please try again later.");

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new EmbedBuilder()
                    .setTitle(res[0].title)
                    // @ts-ignore
                    .setColor(client.bahamut.config.primary_message_color)
                    .setImage(res[0].url)
                    .setURL("https://reddit.com" + res[0].permalink),
            ],
        });
    },
};