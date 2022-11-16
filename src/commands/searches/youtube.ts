import { CommandConfig } from "../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import YouTube from "youtube-sr";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import { createErrorResponse, handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "youtube",
    aliases: ["y"],
    type: CommandType.LEGACY,
    description: "Search something on YouTube.",
    minArgs: 1,
    expectedArgs: "<search term>",
    options: [
        {
            name: "search-term",
            description: "Search term.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    category: "Searches",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         args,
                         interaction,
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("searches")) return;

        try {
            const results = await YouTube.search(args.join(" "), { limit: 10, safeSearch: true, type: "video" });

            if (!results || results.length <= 0) return handleErrorResponseToMessage(client, message || interaction, false, true, "No search results for this query.");

            let embedString = "", i = 1;
            for (const res of results) {
                embedString += `\`${i}\` [${(res.title!.length > 100 ? (res.title!.substring(0, 100) + "\u2026") : res.title)}](${res.url})\n`;

                i++;
            }

            return handleResponseToMessage(client, message || interaction, false, "ephemeral", {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle("Search Results")
                        .setDescription(`${embedString}`),
                ],
            });
        } catch (ex) {
            console.error("Error fetching Youtube results:", ex);
            return handleErrorResponseToMessage(client, message || interaction, true, "ephemeral", {
                ...createErrorResponse(client, "An error occured while fetching the YouTube results. Please try again later."),
                components: [],
            });
        }
    },
};