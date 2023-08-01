import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import * as emoji from "node-emoji";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import { handleErrorResponseToMessage, handleSuccessResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "stop",
    type: CommandType.LEGACY,
    description: "Stop the currently running music and clear the queue.",
    category: "Music (/music)",
    guildOnly: true,
    deferReply: true,
    testOnly: false,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) {
            if (client.bahamut.runningGames.get(channel.guild.id)!.obj.finished) client.bahamut.runningGames.delete(channel.guild.id);
            return;
         }

        // Run pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, member, interaction }, config, [
            { type: PreCheckType.USER_IS_DJ },
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]);
        if (await checks.runChecks()) return;

        const player = client.bahamut.musicHandler.getPlayer(channel.guild.id);
        if (!player || !player.kazaPlayer.playing && !player.kazaPlayer.paused) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is nothing playing at the moment!");

        player.destroy();

        return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("stop_button")} Playback has been stopped!`);
    },
};
