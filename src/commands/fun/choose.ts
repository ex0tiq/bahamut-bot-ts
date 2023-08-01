import { randomIntBetween } from "../../lib/toolFunctions.js";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "choose",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Let the bot choose something for you.",
    minArgs: 1,
    expectedArgs: "[something1] [something2] [something3]",
    options: [
        {
            name: "things",
            description: "Things to choose (comma separated).",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    category: "Fun (/fun)",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, args, interaction }: { client: BahamutClient, message: Discord.Message, args: any[], interaction: Discord.CommandInteraction }) => {
        if (args.length < 2) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You need to provide at least two things to choose between!");
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "Bahamuts Ruling", iconURL: client.bahamut.config.avatar_link })
                    .setDescription(`I choose **${args[randomIntBetween(0, args.length) - 1]}** for you!`),
            ],
        });
    },
};