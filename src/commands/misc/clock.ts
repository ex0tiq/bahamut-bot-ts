import { DateTime } from "luxon";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import { handleResponseToMessage } from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "clock",
    aliases: ["time", "date"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get the current time and date.",
    category: "Miscellaneous",
    guildOnly: true,
    deferReply: false,
};

export default {
    ...config,
    callback: async ({ client, message, channel }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("miscellaneous")) return;

        const date_format = settings.time_format_24h ? "dd.LL.yyyy" : "LL/dd/yyyy",
            time_zone = settings.timezone || "Europe/Berlin";

        return handleResponseToMessage(client, message, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "Current date and time", iconURL: client.bahamut.config.emoji_icons.clock2 })
                    .setFields(
                        { name: "Date", value: DateTime.now().setZone(time_zone).toFormat(date_format) },
                        { name: "Time", value: DateTime.now().setZone(time_zone).toLocaleString(settings.time_format_24h ? DateTime.TIME_24_SIMPLE : DateTime.TIME_SIMPLE) },
                        { name: "Server Timezone", value: `${time_zone} ${time_zone === "Europe/Berlin" ? "(Default)" : ""}` },
                    ),
            ],
        });
    },
};