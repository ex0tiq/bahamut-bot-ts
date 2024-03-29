import { Connectors } from "shoukaku";
import { Kazagumo, KazagumoTrack, Plugins, PlayerState, KazagumoPlayer, KazagumoSearchResult } from "kazagumo";
import Spotify from "kazagumo-spotify"; 
import Deezer from "kazagumo-deezer";


import { Client } from "genius-lyrics";
import * as emoji from 'node-emoji'
import ytdl from "ytdl-core";
import { randomIntBetween, toProperCase } from "../lib/toolFunctions.js";
import { DateTime } from "luxon";
import Discord, { ClientUser, GuildMember } from "discord.js";
import { Bahamut } from "../bahamut.js";
import { ExtendedTrack, RadioStation } from "../../typings.js";
import { getGuildSettings } from "../lib/getFunctions.js";
import {
    createErrorResponse,
    createSuccessResponse,
    handleErrorResponseToChannel,
    handleResponseToChannel,
} from "../lib/messageHandlers.js";
import logger from "./Logger.js";
import { isUserAdminOfGuild, isUserModOfGuild } from "../lib/checkFunctions.js";
import { readFileSync } from 'fs';
import { resolve } from "path";
import ExtendedKazagumoPlayer from "./ExtendedKazagumoPlayer.js";

export default class LavaManager {
    // Bahamut parent class
    private _bahamut: Bahamut;
    // Contains all defined radio stations
    private _radioStations: { [id: string]: RadioStation };
    // Contains all defined music filters
    private _filters: {};
    // Contains all music timers
    private _leaveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map<string, ReturnType<typeof setTimeout>>;
    // Contains all vote skips
    private _voteSkips: Map<string, string[]> = new Map<string, string[]>;
    // Contains all extended kazagumo players
    private _players: Map<string, ExtendedKazagumoPlayer> = new Map<string, ExtendedKazagumoPlayer>;
    
    // Contains the genius client
    private _geniusClient: Client;
    // Contains the Kazagumo manager
    private _manager: Kazagumo;
    
    constructor(bahamut: Bahamut) {
        this._bahamut = bahamut;
        this._radioStations = JSON.parse(
            readFileSync(resolve("assets/radio_stations.json"), "utf-8")
        );
        this._filters = JSON.parse(
            readFileSync(resolve("assets/music_filters.json"), "utf-8")
        );

        this._geniusClient = new Client(this._bahamut.config.genius_token);

        // Init new lavamanager
        this._manager = new Kazagumo({
            defaultSearchEngine: "youtube",

            send: (guildId, payload) => {
                const guild = bahamut.client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            },
                
            plugins: [
                new Plugins.PlayerMoved(this._bahamut.client),
                new Spotify({
                    clientId: this._bahamut.config.spotify_client_id,
                    clientSecret: this._bahamut.config.spotify_client_secret,
                    playlistPageLimit: 50,
                    albumPageLimit: 50,
                    searchLimit: 25,
                    searchMarket: "US"
                }),
                new Deezer()
            ]
        }, 
        new Connectors.DiscordJS(bahamut.client), 
        this._bahamut.config.lavalink_settings.nodes);


        // Add schedule job to implement regular leave check
        this._bahamut.schedules.set("musicLeaveCheck", this._bahamut.scheduler.scheduleJob("*/5 * * * *", async () => {
            for(const [guild, player] of this._manager.players) {
                const guild_settings = await getGuildSettings(this._bahamut.client, guild),
                    voiceChannel = player.voiceId ? this._bahamut.client.channels.cache.get(player.voiceId) as Discord.VoiceBasedChannel : null,
                    textChannel = player.textId ? this._bahamut.client.channels.cache.get(player.textId) as Discord.GuildTextBasedChannel : null;

                if (!voiceChannel || !textChannel) continue;
                if (guild_settings.premium_user && !guild_settings.music_leave_on_empty) continue;

                if (guild_settings.music_leave_on_empty && voiceChannel.members.filter(m => !m.user.bot).size <= 0) {
                    if (this._leaveTimers.has(voiceChannel.guild.id)) {
                        clearTimeout(this._leaveTimers.get(voiceChannel.guild.id));
                        this._leaveTimers.delete(voiceChannel.guild.id);
                    }

                    player.destroy();

                    return handleResponseToChannel(this._bahamut.client, textChannel, createSuccessResponse(this._bahamut.client, {
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setDescription(`${emoji.get("stop_button")} No one listening anymore. Stopping playback and leaving the channel.`),
                        ],
                    }, true));
                }
            }
        }));

        // Update raw voice state
        // this._bahamut.client.on("raw", d => this._manager.updateVoiceState(d));

        // If not premium, end stream playback after 60 seconds if channel is empty
        // eslint-disable-next-line no-unused-vars
        this._bahamut.client.on("voiceStateUpdate", async (oldState, newState) => {
            // Skip if no player is currently playing on this server
            if (!this._manager.players.has(oldState.guild.id)) return;

            const player = this._manager.players.get(oldState.guild.id),
                voiceChannel = player?.voiceId ? this._bahamut.client.channels.cache.get(player.voiceId) as Discord.VoiceBasedChannel : null,
                textChannel = player?.textId ? this._bahamut.client.channels.cache.get(player.textId) as Discord.GuildTextBasedChannel : null;

            if (!voiceChannel || !textChannel) return;

            const settings = await getGuildSettings(this._bahamut.client, oldState.guild);

            // Ignore if server has premium enabled
            if (settings.premium_user && !settings.music_leave_on_empty) return;
            // If no members left in channel
            if (voiceChannel.members.filter(m => !m.user.bot).size <= 0) {
                // If leave timer already set -> ignore
                if (this._leaveTimers.has(voiceChannel.guild.id)) return;
                // Register leave timer in 60 seconds
                this._leaveTimers.set(voiceChannel.guild.id, setTimeout(async () => {
                    if (player && (player.playing || player.paused)) {
                        await player.destroy();

                        await handleResponseToChannel(this._bahamut.client, textChannel, createSuccessResponse(this._bahamut.client, {
                            embeds: [
                                new Discord.EmbedBuilder()
                                    .setDescription(`${emoji.get("stop_button")} No more listeners. Stopping playback and leaving the channel.`),
                            ],
                        }, true));
                    }

                    clearTimeout(this._leaveTimers.get(voiceChannel.guild.id));
                    this._leaveTimers.delete(voiceChannel.guild.id);
                }, 60000));
            } else {
                // Ignore if no leave timer present
                if (!this._leaveTimers.has(voiceChannel.guild.id)) return;

                // Remove leave timer if members in voice channel
                clearTimeout(this._leaveTimers.get(voiceChannel.guild.id));
                this._leaveTimers.delete(voiceChannel.guild.id);
            }
        });

        // Emitted whenever a node connects
        // this._manager.on("nodeConnect", node => {
        //    logger.log(this._bahamut.client.shardId, `Lavalink Node "${node.options.identifier}" connected.`);
        //});

        // Emitted whenever a node encountered an error
        this._manager.shoukaku.on("error", (node, error) => {
            logger.log(this._bahamut.client.shardId, `Lavalink encountered an error: ${error.message}.`);
        });

        // Listen for when the client becomes ready
        //this._bahamut.client.once("ready", () => {
            // Initiates the manager and connects to all the nodes
        //    this._manager.init(this._bahamut.client.user!.id);
        //});

        // eslint-disable-next-line no-unused-vars
        this._manager.on("playerMoved", async (player, oldChannel, newChannel) => {
            if (!this._bahamut.client.guilds.cache.has(player.guildId)) return;

            // let guild = this.client.guilds.cache.get(player.guild);
            //    newChannel = await resolveChannel(null, newChannel, false, guild);
            // if (!newChannel) return;

            if (player.state !== PlayerState.CONNECTED && player.state !== PlayerState.CONNECTING) player.connect();

            // let current_position = player.position;
            // player.queue.add(player.queue.current, 0);
            // player.set("skip_trackstart", true);


            await player.pause(true);

            await player.pause(false);

            // Stop playback and start anew, required for stage channels
            // await player.stop();
            // Seek to stopped position
            // if (player.playing) await player.seek(current_position);

            // if (!player.playing && !player.paused && !player.queue.size) await player.play();
        });

        // Emitted when a track starts
        this._manager.on("playerStart", async (player: KazagumoPlayer, track: KazagumoTrack) => {
            const extPlayer = this.getPlayer(player.guildId);

            if (extPlayer!.getCurrentlyRunningGameName()) return;

            const voiceChannel = extPlayer?.kazaPlayer.voiceId ? this._bahamut.client.channels.cache.get(extPlayer.kazaPlayer.voiceId) as Discord.VoiceBasedChannel : null,
                textChannel = extPlayer?.kazaPlayer.textId ? this._bahamut.client.channels.cache.get(extPlayer.kazaPlayer.textId) as Discord.GuildTextBasedChannel : null;

            if (!voiceChannel || !textChannel) return;

            const settings = await getGuildSettings(this._bahamut.client, textChannel.guild);

            if (extPlayer!.getSkipTrackStart()) {
                extPlayer!.setSkipTrackStart(false);
                if (settings.premium_user) extPlayer!.kazaPlayer.setVolume(settings.music_volume);
                return;
            }

            // If premium enabled
            if (settings.premium_user) {
                // If leave on empty enabled & no voiceChannel members left -> leave voiceChannel
                if (settings.music_leave_on_empty && voiceChannel.members.filter(m => !m.user.bot).size <= 0) {
                    if (this._leaveTimers.has(voiceChannel.guild.id)) {
                        clearTimeout(this._leaveTimers.get(voiceChannel.guild.id));
                        this._leaveTimers.delete(voiceChannel.guild.id);
                    }

                    player.destroy();

                    return handleResponseToChannel(this._bahamut.client, textChannel, createSuccessResponse(this._bahamut.client, {
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setDescription(`${emoji.get("stop_button")} No one listening anymore. Stopping playback and leaving the channel.`),
                        ],
                    }, true));
                }

                extPlayer!.kazaPlayer.setVolume(settings.music_volume);
            } else if (voiceChannel.members.filter(m => !m.user.bot).size <= 0) {
                if (this._leaveTimers.has(voiceChannel.guild.id)) {
                    clearTimeout(this._leaveTimers.get(voiceChannel.guild.id));
                    this._leaveTimers.delete(voiceChannel.guild.id);
                }

                player.destroy();

                return handleResponseToChannel(this._bahamut.client, textChannel, createSuccessResponse(this._bahamut.client, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setDescription(`${emoji.get("stop_button")} No one listening anymore. Stopping playback and leaving the channel.`),
                    ],
                }, true));
            }

            // Apply filter if enabled

            if (typeof track.requester !== "undefined") await this._bahamut.dbHandler.guildUserStat.addDBGuildUserStat(textChannel.guild, track.requester as Discord.GuildMember, "played_songs", 1);

            await handleResponseToChannel(this._bahamut.client, textChannel, (await this.getPlaySongEmbed(textChannel, extPlayer!, track, track.requester as Discord.GuildMember)));
        });

        // Emitted the player queue ends
        this._manager.on("playerEmpty", async (player: KazagumoPlayer) => {
            const extPlayer = this.getPlayer(player.guildId);

            if (extPlayer!.getCurrentlyRunningGameName()) return;

            const voiceChannel = extPlayer?.kazaPlayer.voiceId ? this._bahamut.client.channels.cache.get(extPlayer.kazaPlayer.voiceId) as Discord.VoiceBasedChannel : null,
                textChannel = extPlayer?.kazaPlayer.textId ? this._bahamut.client.channels.cache.get(extPlayer.kazaPlayer.textId) as Discord.GuildTextBasedChannel : null;
            if (!voiceChannel || !textChannel) return;

            const settings = await getGuildSettings(this._bahamut.client, textChannel.guild),
                uri = extPlayer!.kazaPlayer.queue.previous?.realUri || extPlayer!.kazaPlayer.queue.previous?.uri;

            // Run music autoplay
            if (uri && ytdl.validateURL(uri) && settings.music_autoplay && settings.premium_user) {
                const data = await ytdl.getInfo(uri);
                if (data.related_videos && data.related_videos.length > 0) {
                    const res = await this._manager.search("https://www.youtube.com/watch?v=" + data.related_videos[0].id);
                    if (res && res.tracks.length > 0) {
                        extPlayer!.kazaPlayer.queue.add(res.tracks[0]);
                        if (!extPlayer!.kazaPlayer.playing && !extPlayer!.kazaPlayer.paused && !extPlayer!.kazaPlayer.queue.size) await extPlayer!.kazaPlayer.play();
                        return;
                    }
                } else {
                    let res;
                    try {
                        // Search for tracks using a query or url, using a query searches youtube automatically and the track requester object
                        res = await this._manager.search(`music ${DateTime.now().toFormat("yyyy")}`);
                    } catch (err) {
                        console.error("Error while fetching related videos:", err);

                        if (this._leaveTimers.has(voiceChannel.guild.id)) {
                            clearTimeout(this._leaveTimers.get(voiceChannel.guild.id));
                            this._leaveTimers.delete(voiceChannel.guild.id);
                        }

                        player.destroy();

                        return handleErrorResponseToChannel(this._bahamut.client, textChannel, createErrorResponse(this._bahamut.client, "An internal error occurred while doing that. Please try again later."));
                    }

                    let rand = randomIntBetween(0, (res.tracks.length - 1));

                    if (res && res.tracks[rand].isStream && !settings.premium_user) {
                        do {
                            rand = randomIntBetween(0, (res.tracks.length - 1));
                        } while (res.tracks[rand].isStream);

                        // Streams not allowed for non premium users
                        // return this.client.premiumManager.getGuildNotPremiumMessage(channel.guild, null, `Playing music streams requires an active premium subscription.\nIf you want to know more about this, please check out our [website](${this.client.config.website_link}).`);
                    }

                    if (res && res.tracks.length > 0) {
                        extPlayer!.kazaPlayer.queue.add(res.tracks[rand]);
                        if (!extPlayer!.kazaPlayer.playing && !extPlayer!.kazaPlayer.paused && !extPlayer!.kazaPlayer.queue.size) await extPlayer!.kazaPlayer.play();

                        return;
                    }
                }
            }

            if (this._leaveTimers.has(voiceChannel.guild.id)) {
                clearTimeout(this._leaveTimers.get(voiceChannel.guild.id));
                this._leaveTimers.delete(voiceChannel.guild.id);
            }

            player.destroy();

            return handleResponseToChannel(this._bahamut.client, textChannel, createSuccessResponse(this._bahamut.client, `${emoji.get("stop_button")} No song left to play! Stopping playback and leaving the channel.`, true));
        });
    }

    // Getter & Setter
    public get manager() {
        return this._manager;
    }
    public get radioStations() {
        return this._radioStations;
    }
    public set radioStations(rad) {
        this._radioStations = rad;
    }
    public get filters() {
        return this._filters;
    }
    public set filters(fil) {
        this._filters = fil;
    }
    public get voteSkips() {
        return this._voteSkips;
    }
    public get leaveTimers() {
        return this._leaveTimers;
    }
    public get players() {
        return this._players;
    }

    // Misc functions
    createPlayer = async(guildId: string, textId: string, voiceId: string) => {
        const kazaPlayer = this.manager.getPlayer(guildId);
        if (kazaPlayer) return (new ExtendedKazagumoPlayer(this, kazaPlayer));
        

        const extPlayer = new ExtendedKazagumoPlayer(this, await this.manager.createPlayer({
            guildId: guildId,
            voiceId: voiceId,
            textId: textId
        }));

        this._players.set(guildId, extPlayer);

        return extPlayer;
    };

    getPlayer = (guildId: string) => {
        return (this._players.has(guildId) ? this._players.get(guildId) : null);
    }

    getTrackStartEmbed = async (player: ExtendedKazagumoPlayer, track: KazagumoTrack, requester: Discord.GuildMember) => {
        const textChannel = player?.kazaPlayer.textId ? this._bahamut.client.channels.cache.get(player.kazaPlayer.textId) as Discord.GuildTextBasedChannel : null;
        if (!textChannel) return;

        return this.getPlaySongEmbed(textChannel, player, track, requester);
    };

    getTrackAddEmbed = async (player: KazagumoPlayer, track: KazagumoTrack, requester: Discord.GuildMember) => {
        const textChannel = player?.textId ? this._bahamut.client.channels.cache.get(player.textId) as Discord.GuildTextBasedChannel : null;
        if (!textChannel) return;

        const settings = await getGuildSettings(this._bahamut.client, textChannel.guild);

        return createSuccessResponse(this._bahamut.client, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setTitle(`${emoji.get("page_facing_up")} Music Queue`)
                    .setDescription(`[${!["youtube","soundcloud"].includes(track.sourceName)  ? `${track.author} - ` : ""}${track.title}](${track.realUri || track.uri}) has been added to the queue!\n\nThere are now \`${player.queue.size}\` songs in the queue!`)
                    .setFields(
                        { name: "Requester", value: `${requester}`, inline: false }
                    )
                    .setFooter({ text: `You can search and pick results using "${settings.prefix}search".` }),
            ],
        });
    };

    getListStartEmbed = async (player: KazagumoPlayer, playlist: KazagumoSearchResult, requester: Discord.GuildMember) => {
        const textChannel = player?.textId ? this._bahamut.client.channels.cache.get(player.textId) as Discord.GuildTextBasedChannel : null;
        if (!textChannel) return;

        const settings = await getGuildSettings(this._bahamut.client, textChannel.guild);

        return createSuccessResponse(this._bahamut.client, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setTitle(`${emoji.get("page_facing_up")} Music Queue`)
                    .setDescription(`Added \`${playlist.tracks.length}\` items from playlist ${playlist.playlistName ? `\`${playlist.playlistName}\`` : ""} to the queue!`)
                    .setFields(
                        { name: "Requester", value: `${requester}`, inline: false }
                    )
                    .setFooter({ text: `You can search and pick results using "${settings.prefix}search".` }),
            ],
        });
    };

    getListAddEmbed = async (player: KazagumoPlayer, playlist: KazagumoSearchResult, requester: Discord.GuildMember) => {
        const textChannel = player?.textId ? this._bahamut.client.channels.cache.get(player.textId) as Discord.GuildTextBasedChannel : null;
        if (!textChannel) return;

        const settings = await getGuildSettings(this._bahamut.client, textChannel.guild);

        return createSuccessResponse(this._bahamut.client, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setTitle(`${emoji.get("page_facing_up")} Music Queue`)
                    .setDescription(`Added \`${playlist.tracks.length}\` additional items from playlist ${playlist.playlistName ? `\`${playlist.playlistName}\`` : ""} to the queue!\n\nThere are now \`${player.queue.size}\` songs in the queue!`)
                    .setFields(
                        { name: "Requester", value: `${requester}`, inline: false }
                    )
                    .setFooter({ text: `You can search and pick results using "${settings.prefix}search".` }),
            ],
        });
    };

    musicStatus = async (player: ExtendedKazagumoPlayer, embed: Discord.EmbedBuilder) => {
        const textChannel = player?.kazaPlayer.textId ? this._bahamut.client.channels.cache.get(player.kazaPlayer.textId) as Discord.GuildTextBasedChannel : null;
        if (!textChannel) return embed;

        const settings = await getGuildSettings(this._bahamut.client, textChannel.guild);

        embed.addFields({ name: "Volume", value: `${player.kazaPlayer.volume * 100}%`, inline: true });

        if (player.kazaPlayer.loop === "track" || player.kazaPlayer.loop === "queue") {
            if (player.kazaPlayer.loop === "track") embed.addFields({ name: "Repeat", value: "Song", inline: true });
            else embed.addFields({ name: "Repeat", value: "Queue", inline: true });
        } else {
            embed.addFields({ name: "Repeat", value: "Off", inline: true });
        }

        embed.addFields({ name: "Filter", value: `${player.getCurrentFilterName() ? toProperCase(player.getCurrentFilterName()!) : "Off"}`, inline: true });
        embed.addFields({ name: "Autoplay", value: (settings.music_autoplay ? "On" : "Off"), inline: true });

        return embed;
    };

    getPlaySongEmbed = async (channel: Discord.GuildTextBasedChannel, player: ExtendedKazagumoPlayer, track: KazagumoTrack, requester?: Discord.GuildMember) => {
        if ((channel === null || typeof channel === "undefined") || (player === null || typeof player === "undefined") || (track === null || typeof track === "undefined")) {
            return createErrorResponse(this._bahamut.client, "Error while getting title information.");
        }

        try {
            const settings = await getGuildSettings(this._bahamut.client, channel.guild);

            let link = "";
            const song = {
                website_url: undefined,
                tracklist: undefined,
                ...track,
            } as ExtendedTrack;

            // eslint-disable-next-line prefer-const
            let albumCover = null;
            /*
            if (!song.isStream) {
                const searches = await this._geniusClient.songs.search(song.title),
                    firstRes = searches[0] || null;
                albumCover = firstRes.album ? firstRes.album.image : firstRes.image;
                song.title = firstRes.fullTitle || firstRes.title;
            }
            */
            if (song.isStream) {
                for (const [, val] of Object.entries(this._radioStations)) {
                    if (val.name.toLowerCase() === player.getCurrentRadioStationName()) {
                        song.website_url = val.website_url;
                        song.tracklist = val.tracklist;
                        song.title = val.name;

                        break;
                    }
                }
            }

            if (song.isStream && song.website_url) {
                link = song.website_url;
            } else {
                link = song.realUri || song.uri;
            }

            const embed = createSuccessResponse(this._bahamut.client, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle(`${song.isStream ? emoji.get("radio") : emoji.get("notes")} Now playing${song.isStream ? " (Stream)" : ""}`)
                        .setDescription(`**[${!["youtube","soundcloud"].includes(song.sourceName)  ? `${song.author} - ` : ""}${song.title}](${link})**${song.tracklist ? `\n\nPlaylist:\n${song.tracklist}` : ""}`)
                        .setFields(
                            { name: "Requester", value: `${(requester) ? requester : (typeof song.requester === "undefined" ? `${emoji.get("control_knobs")} Autoplay` : song.requester)}`, inline: false }
                        ),
                ],
            });

            if (!song.isStream) {
                for (const e of embed.embeds!) {
                    e.setThumbnail((albumCover == null) ? (song.thumbnail || null) : albumCover);
                    e.setFooter({ text: `Use "${settings.prefix}lyrics" to see the lyrics of this song!` });
                }
            } else if (song.isStream && song.thumbnail !== null) {
                for (const e of embed.embeds!) {
                    e.setThumbnail(song.thumbnail || null);
                }
            }

            return embed;
        } catch (ex) {
            console.error("Error while getting title information:", ex);

            return createErrorResponse(this._bahamut.client, "Error while getting title information!");
        }
    };

    userHasDJRights = async (user: Discord.GuildMember, guild: Discord.Guild) => {
        if (user.id === this._bahamut.config.owner_id) return true;

        const settings = await getGuildSettings(this._bahamut.client, user.guild);

        if (user.voice.channel?.members.size === 2 || !settings.music_dj_role) {
            return true;
        }

        if ((await isUserAdminOfGuild(this._bahamut.client, user, guild) || user.permissions.has(Discord.PermissionFlagsBits.Administrator)) || await isUserModOfGuild(this._bahamut.client, user, guild)) {
            return true;
        } else if (typeof settings.music_dj_role !== "undefined" && settings.music_dj_role) {
            const role = guild.roles.resolve(settings.music_dj_role);

            return role !== null && user.roles.cache.has(role.id);
        } else {
            return false;
        }
    };

    isUserInVoiceChannel = (user: Discord.GuildMember) => {
        if (!user || !user.voice) return false;
        return !!user.voice.channelId;
    };
    isUserInSameVoiceChannelAsBot = (guild: Discord.Guild, user: Discord.GuildMember) => {
        return !(guild.members.me?.voice.channelId && (user.voice.channelId !== guild.members.me.voice.channelId));
    };

    /**
     * If message channel is music channel
     * @param {string|null} channel
     */
    isChannelMusicChannel = async (channel: Discord.GuildTextBasedChannel) => {
        const settings = await getGuildSettings(this._bahamut.client, channel.guild);

        // if no music channel is set, every channel is a music channel
        if (!settings || !settings.music_channels || settings.music_channels.length < 1) {
            return true;
        }

        return settings.music_channels.includes(channel.id);

    };

    getUserNoDJPermMessage = () => {
        return createErrorResponse(this._bahamut.client, "This command can only be used by members with the DJ role!");
    };
    getChannelNotMusicChannelMessage = async (message: Discord.Message | Discord.CommandInteraction) => {
        const settings = await getGuildSettings(this._bahamut.client, message.guild!);

        const ch = [];
        for (const c of settings.music_channels) {
            let chan;
            if ((chan = message.guild!.channels.resolve(c))) {
                ch.push(chan);
            }
        }

        return createErrorResponse(this._bahamut.client, `This command can only be used in a music channel${ch.length > 0 ? `: ${ch.join(", ")}` : ""}!`);
    };
}
