import { CommandConfig } from "../../../typings.js";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import {
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";
import axios from "axios";

const trim = (str: string, max: number) => ((str.length > max) ? `${str.slice(0, max - 3)}...` : str);

const config: CommandConfig = {
    name: "urbandictionary",
    aliases: ["urban", "ud", "urb"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Search a term on the urban dictionary",
    expectedArgs: "<search term>",
    options: [
        {
            name: "search-term",
            description: "Search term.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    minArgs: 1,
    category: "Searches (/search)",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    deferReply: true,
    guildOnly: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("searches")) return;

        const query = (new URLSearchParams({ term: args.join(" ") })).toString();
        let resp = null;

        try {
            resp = await axios("https://api.urbandictionary.com/v0/define?" + query);
        }
        catch(e) {
            console.error("Error while fetching Urbandictionary result:", e);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Error while fetching results for \`${args.join(" ")}\`.`);
        }

        if (resp == null) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Error while fetching results for \`${args.join(" ")}\`.`);
        }
        else {
            try {
                if (!resp.data.list.length) {
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `No search results found for \`${args.join(" ")}\`.`);
                }
                else {
                    const [answer] = resp.data.list;
                    return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setTitle(`Definition: ${answer.word}`)
                                .setDescription(answer.definition)
                                .setURL(answer.permalink)
                                .setFields(
                                    { name: "Example", value: `\`\`\`${trim(answer.example, 1024)}\`\`\``, inline: false }
                                ),
                        ],
                    });
                }
            }
            catch(err) {
                console.error("Error while fetching Urbandictionary results:", err);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Error while fetching results for \`${args.join(" ")}\`.`);
            }
        }
    },
};