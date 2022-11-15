import { CommandConfig } from "../../../typings";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { handleResponseToMessage } from "../../lib/messageHandlers";
import { CommandType } from "wokcommands";
// Non ES imports
const lenny = require("lenny");

const config: CommandConfig = {
    name: "lenny",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get a random lenny face.",
    category: "Fun",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, interaction }: { client: BahamutClient, message: Discord.Message, interaction: Discord.CommandInteraction }) => {

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setDescription(`\`${lenny()}\``),
            ],
        });
    },
};