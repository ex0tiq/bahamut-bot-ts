import snoowrap from "snoowrap";
import { CommandConfig } from "../../../typings.js";
import { CommandType, CooldownTypes } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { createErrorResponse, handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "reddit",
    aliases: ["r"],
    type: CommandType.LEGACY,
    description: "Search something on Reddit (sorted by new).",
    minArgs: 1,
    expectedArgs: "<search-term>",
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
            const r = new snoowrap({
                userAgent: client.bahamut.config.reddit.userAgent,
                clientId: client.bahamut.config.reddit.appid,
                clientSecret: client.bahamut.config.reddit.secret,
                refreshToken: client.bahamut.config.reddit.refreshToken,
            });

            const results = await r.search({ query: args.join(" "), sort: "new", limit: 10 });

            if (!results) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This search did not return any results. Please try again.");

            let embedString = "", i = 1;
            for (const res of results) {
                embedString += `\`${i}\` [${(res.title.length > 100 ? (res.title.substring(0, 100) + "\u2026") : res.title)}](${"https://reddit.com" + res.permalink})\n`;

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
            console.error("Error fetching Reddit results:", ex);
            return handleErrorResponseToMessage(client, message, false, "ephemeral", {
                ...createErrorResponse(client, "An error occured while fetching the Reddit results. Please try again later."),
                components: [],
            });
        }
    },
};