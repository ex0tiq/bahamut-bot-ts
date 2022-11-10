import Discord from 'discord.js';
import {CommandType} from "wokcommands";
import {getGuildSettings} from "../../lib/getFunctions";
import BahamutClient from "../../modules/BahamutClient";
import {
    createMissingParamsErrorResponse,
    createMissingPermErrorResponse,
    handleErrorResponseToMessage
} from "../../lib/messageHandlers";

const config = {
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
    callback: async ({ client, message, channel, member, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.GuildTextBasedChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes('music')) return;

        if (!await client.bahamut.musicHandler.isChannelMusicChannel(channel)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await client.bahamut.musicHandler.getChannelNotMusicChannelMessage(message));
        if (!client.bahamut.musicHandler.isUserInVoiceChannel(member)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'You\'re not in a voice channel!');
        if (!client.bahamut.musicHandler.isUserInSameVoiceChannelAsBot(channel.guild, member)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'You\'re not in the same voice channel as the bot!');
        if (!channel.guild.members.me!.permissions.has(Discord.PermissionFlagsBits.Connect)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingPermErrorResponse(client, "CONNECT"));
        if (!channel.guild.members.me!.permissions.has(Discord.PermissionFlagsBits.Speak)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingPermErrorResponse(client, "SPEAK"));
        //if (typeof client.runningGames[channel.guild.id] !== 'undefined') return handleBotMessage(client, message, 'error', 'There is a running music quiz on this guild. Please finish it before playing music.', false, null, channel);
        const search = args.join(' ');
        if (!search) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));

        if (!client.bahamut.musicHandler.manager.leastUsedNodes.first()) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply,'There are no music nodes available. Please try again later.');

        let res;

        try {
            // Search for tracks using a url, using a query searches youtube automatically and the track requester object
            res = await client.bahamut.musicHandler.manager.search(search, member);

            // Check the load type as this command is not that advanced for basics
            if (res.loadType === 'LOAD_FAILED') return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'An internal error occurred while doing that. Please try again later.');
            else if (res.loadType === 'NO_MATCHES') return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'This search did not return any results! Please try again!');
        }
        catch (err) {
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
            }
            else if (res.loadType === 'SEARCH_RESULT' || res.loadType === 'TRACK_LOADED' || res.tracks.length === 1) {
                lastEmbed = await client.bahamut.musicHandler.getTrackAddEmbed(player, res.tracks[0], member);
            }
            else {
                lastEmbed = await client.bahamut.musicHandler.getListAddEmbed(player, res, member);
            }
        }
        else if (res.loadType === 'SEARCH_RESULT' || res.loadType === 'TRACK_LOADED' || res.tracks.length === 1) {
            player.set('skip_trackstart', true);

            lastEmbed = await client.bahamut.musicHandler.getTrackStartEmbed(player, res.tracks[0], member);
        }
        else {
            player.set('skip_trackstart', true);

            lastEmbed = await client.bahamut.musicHandler.getListStartEmbed(player, res, member);
        }

        if (player.playing && player.queue.current?.isStream) {
            player.stop();
        }
        else if (!player.playing && !player.paused && !player.queue.size) {
            await player.play();
        }
        else if (!player.playing) {await player.play();}

        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////

        if (lastEmbed) return lastEmbed;
        return;
    },
};