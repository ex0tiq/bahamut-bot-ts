import Discord, { ChannelType } from "discord.js";
import { CommandType } from "wokcommands";
import { getGuildSettings } from "../../lib/getFunctions.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";
import { CommandConfig } from "../../../typings.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import { PlayerState } from "kazagumo";

const config: CommandConfig = {
    name: "play",
    aliases: ["p"],
    type: CommandType.LEGACY,
    description: "Play some music",
    expectedArgs: "<link or search>",
    options: [
        {
            name: "link-or-search",
            description: "Link to or search for video.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    minArgs: 1,
    category: "Music",
    guildOnly: true,
    deferReply: true,
    testOnly: false,
};

export default {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         member,
                         args,
                         interaction,
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild),
            search = args.join(" ");
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        const checks = new BahamutCommandPreChecker(client, {
            client,
            message,
            channel,
            args,
            member,
            interaction,
        }, config, [
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            {
                type: PreCheckType.BOT_HAS_PERMISSIONS, requiredPermissions: [
                    { bitField: Discord.PermissionFlagsBits.Connect, name: "CONNECT" },
                    { bitField: Discord.PermissionFlagsBits.Speak, name: "SPEAK" },
                ],
            },
            { type: PreCheckType.ALL_PARAMS_PROVIDED, paramsCheck: !!(search) },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]);
        if (await checks.runChecks()) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it before playing music.");

        let res;

        try {
            // Search for tracks using a url, using a query searches youtube automatically and the track requester object
            res = await client.bahamut.musicHandler.manager.search(search, { requester: member });

            // Check the load type as this command is not that advanced for basics
            if (!res) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
            else if (res.tracks.length <= 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This search did not return any results! Please try again!");
        } catch (err) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
        }

        if (res.tracks[0].isStream && !settings.premium_user) {
            // Streams not allowed for non premium users
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, client.bahamut.premiumHandler.getGuildNotPremiumMessage(`Playing music streams requires an active premium subscription.\nIf you want to know more about this, please check out our [website](${client.bahamut.config.website_link}).`));
        }

        // Create the player
        const player = await client.bahamut.musicHandler.createPlayer(channel.guild.id, channel.id, member.voice.channel!.id);

        if (!player.kazaPlayer.voiceId && member.voice.channelId) player.kazaPlayer.setVoiceChannel(member.voice.channelId.toString());

        // Connect to the voice channel and add the track to the queue
        if (player.kazaPlayer.state !== PlayerState.CONNECTED && player.kazaPlayer.state !== PlayerState.CONNECTING) player.kazaPlayer.connect();

        if (res.tracks.length > 1) player.kazaPlayer.queue.add(res.tracks[0]);
        else player.kazaPlayer.queue.add([...res.tracks]);

        if (player.getCurrentRadioStationName()) player.setCurrentRadioStationName(null);

        let lastEmbed;

        if (player.kazaPlayer.playing) {
            if (player.kazaPlayer.queue.current!.isStream) {
                await player.kazaPlayer.skip();

                player.setSkipTrackStart(true);

                lastEmbed = await client.bahamut.musicHandler.getTrackStartEmbed(player, res.tracks[0], member);
            } else if (res.type === "SEARCH" || res.type === "TRACK" || res.tracks.length === 1) {
                lastEmbed = await client.bahamut.musicHandler.getTrackAddEmbed(player.kazaPlayer, res.tracks[0], member);
            } else {
                lastEmbed = await client.bahamut.musicHandler.getListAddEmbed(player.kazaPlayer, res, member);
            }
        } else if (res.type === "SEARCH" || res.type === "TRACK" || res.tracks.length === 1) {
            player.setSkipTrackStart(true);

            lastEmbed = await client.bahamut.musicHandler.getTrackStartEmbed(player, res.tracks[0], member);
        } else {
            lastEmbed = await client.bahamut.musicHandler.getListStartEmbed(player.kazaPlayer, res, member);
        }

        if (player.kazaPlayer.playing && player.kazaPlayer.queue.current?.isStream) {
            player.kazaPlayer.skip();
        } else if (!player.kazaPlayer.playing && !player.kazaPlayer.paused && !player.kazaPlayer.queue.size) {
            await player.kazaPlayer.play();
        } else if (!player.kazaPlayer.playing) {
            await player.kazaPlayer.play();
        }

        // Check if stage channel
        if (channel.guild.members.me?.voice.channel?.type === ChannelType.GuildStageVoice) {
            await channel.guild.members.me?.voice.setSuppressed(false);
            if (channel.guild.members.me?.voice.suppress) channel.guild.members.me?.voice.setRequestToSpeak(true);
        }

        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////

        if (lastEmbed) return handleResponseToMessage(client, message || interaction, false, config.deferReply, lastEmbed);
        return;
    },
};