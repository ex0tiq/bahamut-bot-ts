import { CommandType, CooldownTypes } from "wokcommands";
import Discord from "discord.js";
import { handleResponseToMessage } from "../lib/messageHandlers";
import BahamutClient from "../modules/BahamutClient";

const config = {
    name: "ping",
    aliases: [],
    type: CommandType.LEGACY,
    description: "It like... Pings. Then Pongs. And it's not Ping Pong.",
    category: "Miscellaneous",
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
    callback: async ({ client, message }: { client: BahamutClient, message: Discord.Message }) => {
        await handleResponseToMessage(
            client,
            message,
            false,
            config.deferReply,
            { content: `Pong! Latency is ${Date.now() - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`,
            }
        );
    },
};
