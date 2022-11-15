import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage, handleResponseToMessage,
} from "../../lib/messageHandlers";
import { randomIntBetween } from "../../lib/toolFunctions";

const config: CommandConfig = {
    name: "random",
    aliases: ["rand", "number"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get a random number between [min] and [max]",
    minArgs: 2,
    expectedArgs: "<min> <max>",
    options: [
        {
            name: "min",
            description: "Lower number",
            type: Discord.ApplicationCommandOptionType.Integer,
            required: true,
        },
        {
            name: "max",
            description: "Higher number",
            type: Discord.ApplicationCommandOptionType.Integer,
            required: true,
        },
    ],
    category: "Miscellaneous",
    guildOnly: true,
    deferReply: false,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[] }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("miscellaneous")) return;

        let min = 0, max = 0;

        try {
            min = parseInt(args[0]);
            max = parseInt(args[1]);
        } catch(e) {
            return handleErrorResponseToMessage(client, message, false, config.deferReply, createMissingParamsErrorResponse(client, config));
        }

        if (min > max) {
            return handleErrorResponseToMessage(client, message, false, config.deferReply, "[min] can't be more than [max]!");
        }
        if (max < min) {
            return handleErrorResponseToMessage(client, message, false, config.deferReply, "[max] can't be less than [min]!");
        }

        return handleResponseToMessage(client, message, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "Random Number", iconURL: client.bahamut.config.emoji_icons.game_die })
                    .setDescription(`Your chosen number is...\n\n> **${randomIntBetween(min, max)}**`),
            ],
        });
    },
};