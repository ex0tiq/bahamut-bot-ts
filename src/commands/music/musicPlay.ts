import Discord from 'discord.js';
import {CommandType} from "wokcommands";
import {getGuildSettings} from "../../lib/getFunctions";
import BahamutClient from "../../modules/BahamutClient";
import {
    createMissingParamsErrorResponse,
    createMissingPermErrorResponse,
    handleErrorResponseToMessage
} from "../../lib/messageHandlers";
import {CommandConfig} from "../../../typings";
import {BahamutCommandPreChecker, PreCheckType} from "../../modules/BahamutCommandPreChecker";

const config: CommandConfig = {
    name: 'play',
    aliases: ['p'],
    type: CommandType.LEGACY,
    description: 'Play some music',
    expectedArgs: '<link or search>',
    options: [
        {
            name: 'link-or-search',
            description: 'Link to or search for video.',
            type: 3,
            required: true
        }
    ],
    minArgs: 1,
    category: 'Music',
    guildOnly: true,
    deferReply: true,
    testOnly: false
};

export default {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         member,
                         args,
                         interaction
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild),
            search = args.join(' ');
        // Abort if module is disabled
        if (settings.disabled_categories.includes('music')) return;

        const checks = new BahamutCommandPreChecker(client, {
            client,
            message,
            channel,
            args,
            member,
            interaction
        }, config, [
            {type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL},
            {type: PreCheckType.USER_IN_VOICE_CHANNEL},
            {type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT},
            {
                type: PreCheckType.BOT_HAS_PERMISSIONS, requiredPermissions: [
                    {bitField: Discord.PermissionFlagsBits.Connect, name: "CONNECT"},
                    {bitField: Discord.PermissionFlagsBits.Speak, name: "SPEAK"}
                ]
            },
            {type: PreCheckType.ALL_PARAMS_PROVIDED, paramsCheck: !!(search)},
            {type: PreCheckType.MUSIC_NODES_AVAILABLE}
        ]);
        if (await checks.runChecks()) return;

        let res;

        try {
            // Search for tracks using a url, using a query searches youtube automatically and the track requester object
            res = await client.bahamut.musicHandler.manager.search(search, member);

            // Check the load type as this command is not that advanced for basics
            if (res.loadType === 'LOAD_FAILED') return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'An internal error occurred while doing that. Please try again later.');
            else if (res.loadType === 'NO_MATCHES') return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'This search did not return any results! Please try again!');
        } catch (err) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'An internal error occurred while doing that. Please try again later.');
        }

        if (res.tracks[0].isStream && !settings.premium_user) {
            // Streams not allowed for non premium users
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, client.bahamut.premiumHandler.getGuildNotPremiumMessage(`Playing music streams requires an active premium subscription.\nIf you want to know more about this, please check out our [website](${client.bahamut.config.website_link}).`));
        }

        // Create the player
        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            voiceChannel: member.voice?.channelId || undefined,
            textChannel: channel.id,
        });

        if (!player.voiceChannel && member.voice.channelId) player.setVoiceChannel(member.voice.channelId.toString());

        // Connect to the voice channel and add the track to the queue
        if (player.state !== 'CONNECTED') player.connect();

        if (res.loadType === 'SEARCH_RESULT') player.queue.add(res.tracks[0]);
        else player.queue.add(res.tracks);

        player.set('radio_station', null);

        let lastEmbed;

        if (player.playing) {
            if (player.queue.current!.isStream) {
                await player.stop();

                player.set('skip_trackstart', true);

                lastEmbed = await client.bahamut.musicHandler.getTrackStartEmbed(player, res.tracks[0], member);
            } else if (res.loadType === 'SEARCH_RESULT' || res.loadType === 'TRACK_LOADED' || res.tracks.length === 1) {
                lastEmbed = await client.bahamut.musicHandler.getTrackAddEmbed(player, res.tracks[0], member);
            } else {
                lastEmbed = await client.bahamut.musicHandler.getListAddEmbed(player, res, member);
            }
        } else if (res.loadType === 'SEARCH_RESULT' || res.loadType === 'TRACK_LOADED' || res.tracks.length === 1) {
            player.set('skip_trackstart', true);

            lastEmbed = await client.bahamut.musicHandler.getTrackStartEmbed(player, res.tracks[0], member);
        } else {
            player.set('skip_trackstart', true);

            lastEmbed = await client.bahamut.musicHandler.getListStartEmbed(player, res, member);
        }

        if (player.playing && player.queue.current?.isStream) {
            player.stop();
        } else if (!player.playing && !player.paused && !player.queue.size) {
            await player.play();
        } else if (!player.playing) {
            await player.play();
        }

        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////

        if (lastEmbed) return lastEmbed;
        return;
    },
};