import { CommandConfig } from "../../../typings.js";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { handleResponseToMessage } from "../../lib/messageHandlers.js";
import { CommandType } from "wokcommands";
// @ts-ignore
import lenny from "lenny";

const config: CommandConfig = {
    name: "lenny",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get a random lenny face.",
    category: "Fun (/fun)",
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