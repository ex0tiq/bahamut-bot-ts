import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { randomIntBetween } from "../../lib/toolFunctions.js";
import lang from "../../lib/languageMessageHandlers.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "gif",
    aliases: ["gifsearch"],
    type: CommandType.LEGACY,
    description: "Get or search a random gif.",
    minArgs: 0,
    expectedArgs: "[search]",
    options: [
        {
            name: "search",
            description: "Search term.",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    category: "Fun (/fun)",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, args, channel, interaction }: { client: BahamutClient, message: Discord.Message, args: any[], channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
        if (args.length > 0) {
            client.bahamut.tenor.Search.Query(args.join(" "), "30").then((Results: any) => {
                const rand = randomIntBetween(0, 29);
                const post = Results[rand];

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                   embeds: [
                       new Discord.EmbedBuilder()
                           .setTitle("Gif")
                           .setImage(post.media_formats.gif.url || null)
                           .setFooter({ text: "Via Tenor" }),
                   ],
                });
            }).catch(async (err: any) => {
                console.error("Error fetching gif from tenor:", err);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_fetching_gif"));
            });
        } else {
            client.bahamut.tenor.Trending.GIFs("30").then((Results: any) => {
                const rand = randomIntBetween(0, 29);
                const post = Results[rand];

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setTitle("Gif")
                            .setImage(post.media_formats.gif.url || null)
                            .setFooter({ text: "Via Tenor" }),
                    ],
                });
            }).catch(async (err: any) => {
                console.error("Error fetching gif from tenor:", err);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_fetching_gif"));
            });
        }
    },
};
