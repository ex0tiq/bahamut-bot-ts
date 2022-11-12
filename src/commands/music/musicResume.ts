import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";
import emoji from "node-emoji";
import { handleErrorResponseToMessage, handleSuccessResponseToMessage } from "../../lib/messageHandlers";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";

const config: CommandConfig = {
    name: "resume",
    type: CommandType.LEGACY,
    description: "Resume playing the current song.",
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

        // Run pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, member, interaction }, config, [
            { type: PreCheckType.USER_IS_DJ },
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]);
        if (await checks.runChecks()) return;

        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            textChannel: channel.id,
        });

        if (!player.paused) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Playback is not paused!");

        player.pause(false);

        return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("arrow_forward")} Playback has been resumed!`);
    },
};
