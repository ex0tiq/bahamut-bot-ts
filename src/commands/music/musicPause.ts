import * as emoji from "node-emoji";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import {
    handleErrorResponseToMessage,
    handleSuccessResponseToMessage,
} from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "pause",
    type: CommandType.LEGACY,
    description: "Pause the current song.",
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

        const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_IS_PLAYING, player: player },
        ]);
        if (await musicPlayingCheck.runChecks()) return;
        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it before pausing music.");
        if (player!.kazaPlayer.paused) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Playback is already paused!");

        player!.kazaPlayer.pause(true);

        return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("pause_button")} Playback has been paused!`);
    },
};
