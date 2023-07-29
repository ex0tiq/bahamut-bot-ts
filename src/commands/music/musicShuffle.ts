import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import * as emoji from "node-emoji";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import { handleErrorResponseToMessage, handleSuccessResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "shuffle",
    type: CommandType.LEGACY,
    description: "Shuffle the current queue.",
    category: "Music",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        const player = client.bahamut.musicHandler.getPlayer(channel.guild.id);

        // Run pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, member, interaction }, config, [
            { type: PreCheckType.USER_IS_DJ },
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
            { type: PreCheckType.MUSIC_IS_AVAILABLE, player: player }
        ]);
        if (await checks.runChecks()) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it before you shuffle the queue.");

        if (player!.kazaPlayer.queue.size <= 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There are no songs in the queue to shuffle!");

        player!.kazaPlayer.queue.shuffle();

        return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("twisted_rightwards_arrows")} Queue has been shuffled!`);
    },
};