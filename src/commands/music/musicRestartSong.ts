import emoji from 'node-emoji';
import {CommandConfig} from "../../../typings";
import {CommandType} from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import {getGuildSettings} from "../../lib/getFunctions";
import {BahamutCommandPreChecker, PreCheckType} from "../../modules/BahamutCommandPreChecker";
import {
    handleErrorResponseToMessage,
    handleSuccessResponseToMessage
} from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: 'restart',
    type: CommandType.LEGACY,
    description: 'Restart the current song.',
    category: 'Music',
    guildOnly: true,
    deferReply: true,
    testOnly: false,
};

module.exports = {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         member,
                         args,
                         interaction
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes('music')) return;

        // Run command pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, args, member, interaction }, config, [
            { type: PreCheckType.USER_IS_DJ },
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE }
        ]);
        if (await checks.runChecks()) return;

        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            textChannel: channel.id,
        });

        const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_IS_PLAYING, player: player }
        ]);
        if (await musicPlayingCheck.runChecks()) return;

        if (player.queue.size <= 0 && !player.queue.current) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'There are no songs in the queue to restart!');

        player.seek(0);

        return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get('repeat')} Current track has been restarted!`);
    },
};