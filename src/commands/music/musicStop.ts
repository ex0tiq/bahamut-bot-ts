import {CommandConfig} from "../../../typings";
import {CommandType} from "wokcommands";
import emoji from 'node-emoji';
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import {getGuildSettings} from "../../lib/getFunctions";
import {BahamutCommandPreChecker, PreCheckType} from "../../modules/BahamutCommandPreChecker";
import {handleErrorResponseToMessage, handleSuccessResponseToMessage} from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: 'stop',
    type: CommandType.LEGACY,
    description: 'Stop the currently running music and clear the queue.',
    category: 'Music',
    guildOnly: true,
    deferReply: true,
    testOnly: false,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, args, interaction}: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes('music')) return;

        // TODO
        //if (typeof client.runningGames[channel.guild.id] !== 'undefined') {
        //    if (client.runningGames[channel.guild.id].obj.finished) delete this.client.runningGames[channel.guild.id];
        //    return;
        //}

        // Run pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, member, interaction }, config, [
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

        if (!player.playing && !player.paused) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'There is nothing playing at the moment!');

        player.destroy();

        return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get('stop_button')} Playback has been stopped!`);
    },
};
