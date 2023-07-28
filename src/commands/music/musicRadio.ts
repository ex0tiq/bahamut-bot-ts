import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import * as emoji from "node-emoji";
import Discord, { ChannelType } from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";

const config: CommandConfig = {
    name: "radio",
    type: CommandType.LEGACY,
    description: "Play some web radio.",
    expectedArgs: "[list or station]",
    options: [
        {
            name: "list-or-name",
            description: "Set radio station (use \"list\" for a list of all available stations).",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    minArgs: 0,
    category: "Music",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
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
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        if (args.length <= 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
        // /////////////////////////////////////////////////////
        const station_names = (Object.entries(client.bahamut.musicHandler.radioStations)).sort((a, b) => a[1].name.localeCompare(b[1].name)).map((entry) => entry[0]);

        if (args[0].toLowerCase() === "list") {
            let stationText = "";

            for (let i = 0; i < station_names.length; i++) {
                const station = station_names[i].trim();
                stationText += `• ${client.bahamut.musicHandler.radioStations[station].name} \`${client.bahamut.musicHandler.radioStations[station].music_types}\`\n`;
            }

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle("Available radio stations")
                        .setDescription(stationText),
                ],
            });
        }
        // /////////////////////////////////////////////////////
        // Run command pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, args, member, interaction }, config, [
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            {
                type: PreCheckType.BOT_HAS_PERMISSIONS, requiredPermissions: [
                    { bitField: Discord.PermissionFlagsBits.Connect, name: "CONNECT" },
                    { bitField: Discord.PermissionFlagsBits.Speak, name: "SPEAK" },
                ],
            },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]);
        if (await checks.runChecks()) return;

        // TODO
        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it before playing music.");

        let station = null;

        for (let i = 0; i < station_names.length; i++) {
            const station_name = station_names[i].trim();
            if (client.bahamut.musicHandler.radioStations[station_name].name.toLowerCase().includes(args.join(" ").toLowerCase())) {
                station = client.bahamut.musicHandler.radioStations[station_name];
                break;
            }
        }

        if (!station) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));

        let res;
        try {
            // Search for tracks using a query or url, using a query searches youtube automatically and the track requester object
            res = await client.bahamut.musicHandler.manager.search(station.stream_url, member);
            // Check the load type as this command is not that advanced for basics
            if (res.loadType === "LOAD_FAILED") return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
            else if (res.loadType === "NO_MATCHES") return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("x")} This search did not return any results! Please try again!`);
        } catch (err) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
        }

        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            voiceChannel: member.voice?.channelId || undefined,
            textChannel: channel.id,
        });

        if (!player.voiceChannel && member.voice.channelId) player.setVoiceChannel(member.voice.channelId.toString());

        // Connect to the voice channel and add the track to the queue
        if (player.state !== "CONNECTED") player.connect();

        player.set("radio_station", station.name.toLowerCase());

        player.queue.add(res.tracks[0], 0);

        player.set("skip_trackstart", true);

        if (!player.playing && !player.paused && !player.queue.size) {
            await player.play();
        } else {
            await player.stop();
        }

        // Check if stage channel
        if (channel.guild.members.me?.voice.channel?.type === ChannelType.GuildStageVoice) {
            const voice = await channel.guild.members.me?.voice.setSuppressed(false);
            if (voice.suppress) channel.guild.members.me?.voice.setRequestToSpeak(true);
        }

        const embed = await client.bahamut.musicHandler.getTrackStartEmbed(player, res.tracks[0], member);
        if (embed) return handleResponseToMessage(client, message || interaction, false, config.deferReply, embed);
        return;

    },
};
