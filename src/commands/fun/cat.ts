import Discord from "discord.js";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import * as emoji from "node-emoji";
import BahamutClient from "../../modules/BahamutClient.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "cat",
    aliases: ["cats", "cat"],
    type: CommandType.LEGACY,
    description: "Get a cat image (customize with says/gif/gifsays).",
    minArgs: 0,
    expectedArgs: "[options] [text]",
    options: [
        {
            name: "option",
            description: "Customization option",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
            choices: [{
                name: "says",
                value: "says",
            }, {
                name: "gif (use gifsays if you want custom text)",
                value: "gif",
            }, {
                name: "gifsays",
                value: "gifsays",
            }],
        },
        {
            name: "text",
            description: "Text to apply.",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    category: "Fun",
    guildOnly: true,
    deferReply: true,
    testOnly: false,
};

export default {
    ...config,
    callback: async ({ client, message, args, interaction }: { client: BahamutClient, message: Discord.Message, args: any[], interaction: Discord.CommandInteraction }) => {

        const embed = new Discord.EmbedBuilder()
            .setAuthor({ name: "Cat", iconURL: client.bahamut.config.emoji_icons.cat });

        if (args.length > 0) {
            const arg = args.shift();
            const query = encodeURIComponent(args.join(" "));

            switch (arg.toLowerCase()) {
                case "says":
                    embed.setDescription(`${emoji.get("cat")} Cat says: **${args.join(" ")}**`);
                    embed.setImage("attachment://cat.jpg");

                    return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                        embeds: [embed],
                        files: [(new Discord.AttachmentBuilder(`https://cataas.com/cat/says/${query}`, { name: "cat.jpg" }))],
                    });
                case "gif":
                    embed.setImage("attachment://cat.gif");

                    return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                        embeds: [embed],
                        files: [(new Discord.AttachmentBuilder("https://cataas.com/cat/gif", { name: "cat.gif" }))],
                    });
                case "gifsays":
                    embed.setDescription(`${emoji.get("cat")} Cat says: **${args.join(" ")}**`);
                    embed.setImage("attachment://cat.gif");

                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, {
                        embeds: [embed],
                        files: [(new Discord.AttachmentBuilder(`https://cataas.com/cat/gif/says/${query}`, { name: "cat.gif" }))],
                    });
                default:
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }
        } else {
            embed.setImage("attachment://cat.jpg");

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [embed],
                files: [(new Discord.AttachmentBuilder("https://cataas.com/cat", { name: "cat.jpg" }))],
            });
        }
    },
};