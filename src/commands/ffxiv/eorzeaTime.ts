import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import emoji from "node-emoji";
import EZTime from "eorzea-time";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import { DateTime } from "luxon";
import { handleResponseToMessage } from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "eorzeatime",
    aliases: ["ezt", "fft", "eztime", "fftime"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Shows the current eorzean time.",
    category: "FFXIV",
    guildOnly: true,
    deferReply: false,
};

export default {
    ...config,
    callback: async ({ client, message, channel, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        const ezt = new EZTime(), time = DateTime.fromFormat(ezt.toString(), "HH:mm:ss");
        let timeString = "";

        if (settings.time_format_24h) timeString = time.toFormat("HH:mm:ss");
        else timeString = time.toLocaleString(DateTime.TIME_WITH_SECONDS);

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: `${emoji.get("clock2")} Eorzean Time`, iconURL: client.bahamut.config.game_icons.ffxiv })
                    .setDescription(`It is currently \`${timeString}\` o'clock in Eorzea.`),
            ],
        });
    },
};