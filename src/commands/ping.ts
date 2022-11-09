import {CommandType} from "wokcommands";
import Discord from "discord.js";
import {handleResponseToMessage} from "../lib/messageHandlers";
import BahamutClient from "../modules/BahamutClient";

const config = {
    name: 'ping',
    aliases: [],
    type: CommandType.BOTH,
    description: 'It like... Pings. Then Pongs. And it\'s not Ping Pong.',
    category: 'Miscellaneous',
    cooldown: '10s',
    guildOnly: true,
    testOnly: true,
    deferReply: true
};

export default {
    ...config,
    callback: async ({ client, message, interaction }: { client: BahamutClient, message: Discord.Message, interaction: Discord.CommandInteraction }) => {
        await handleResponseToMessage(
            client,
            message || interaction,
            false,
            config.deferReply,
            { content: `Pong! Latency is ${Date.now() - (message ? message.createdTimestamp : interaction.createdTimestamp)}ms. API Latency is ${Math.round(client.ws.ping)}ms`
            }
        );
    },
};
