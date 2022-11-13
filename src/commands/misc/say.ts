import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import { handleResponseToMessage } from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "say",
    aliases: ["rand", "number"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Let the bot say something.",
    minArgs: 1,
    expectedArgs: "<text>",
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

        return handleResponseToMessage(client, message, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setDescription(args.join(" ")),
            ],
        });
    },
};