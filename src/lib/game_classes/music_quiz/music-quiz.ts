import {
    Message,
    MessageCollector,
    TextChannel,
    Guild,
    GuildMember, ChatInputCommandInteraction, EmbedBuilder, VoiceBasedChannel, GuildTextBasedChannel,
} from "discord.js";
import logger from "../../../modules/Logger.js";
import Spotify from "./spotify.js";
import { QuizArgs } from "./types/quiz-args.js";
import { UnresolvedTrack } from "erela.js";
import latinize from "latinize";
// import { searchSong, getSong } from "genius-lyrics-api";

import { Player } from "erela.js";
import BahamutClient from "../../../modules/BahamutClient.js";
import {
    createErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../messageHandlers.js";
import { resolveUser } from "../../resolveFunctions.js";
import Genius from "genius-lyrics";
// @ts-ignore
import similarText from "locutus/php/strings/similar_text.js";

let stopCommand = "stop";
let skipCommand = "skip";

// eslint-disable-next-line no-control-regex
const nonLatinReg = /[^\u0000-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\uA720-\uA7FF]/g;

export class MusicQuiz {
    guild: Guild;
    textChannel: GuildTextBasedChannel;
    voiceChannel: VoiceBasedChannel;
    message: Message | ChatInputCommandInteraction;
    member: GuildMember;
    messageCollector: MessageCollector | undefined;
    arguments: QuizArgs;
    songs: UnresolvedTrack[] | null | undefined;
    currentSong: number = 0;
    skippers: string[] = [];
    scores: { [key: string]: number; } | undefined;
    artistGuessed: boolean;
    titleGuessed: boolean;
    // eslint-disable-next-line no-undef
    songTimeout: NodeJS.Timeout | undefined;
    reactPermissionNotified: boolean = false;
    client: BahamutClient;
    settings: any;
    player: Player;
    finished: boolean;
    GeniusClient: any;

    private _firstPlay: boolean = true;

    constructor(client: BahamutClient, message: Message | ChatInputCommandInteraction, channel: TextChannel, member: GuildMember, args: QuizArgs, settings: any) {
        this.guild = message.guild!;
        this.message = message;
        this.textChannel = channel;
        this.member = member;
        this.voiceChannel = member.voice!.channel!;
        this.player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            voiceChannel: member.voice.channel?.id,
            textChannel: channel.id,
        });
        this.GeniusClient = new Genius.Client(client.bahamut.config.genius_token);
        this.arguments = args;
        this.client = client;

        this.settings = settings;

        this.artistGuessed = false;
        this.titleGuessed = false;
        this.finished = false;

        this.client.bahamut.musicHandler.manager.on("trackError", this.handlePlayEndEvents.bind(this));
        this.client.bahamut.musicHandler.manager.on("queueEnd", this.handlePlayEndEvents.bind(this));
        this.client.bahamut.musicHandler.manager.on("nodeError", this.handleNodeErrorEvents.bind(this));

        if (!stopCommand.startsWith(this.settings.prefix)) {
            stopCommand = this.settings.prefix + stopCommand;
        }
        if (!skipCommand.startsWith(this.settings.prefix)) {
            skipCommand = this.settings.prefix + skipCommand;
        }
    }

    async start() {
        this.player.set("running_music_quiz", true);

        this.songs = await this.getSongs(
            this.arguments.playlists,
            parseInt(this.arguments.songs, 10)
        );

        if (!this.songs) return handleErrorResponseToMessage(this.client, this.message, false, true, "Error while fetching song. Please try again later.");

        if (!this.songs || this.songs.length === 0) {
            if (this.songs && this.songs.length === 0) {
                await handleErrorResponseToMessage(this.client, this.message, false, true, "Playlist contains no songs");
            }

            this.finish();
            return;
        }

        try {
            if (!this.player.voiceChannel) this.player.setVoiceChannel(this.voiceChannel.toString());
            if (this.player.state !== "CONNECTED") this.player.connect();
        } catch (e) {
            console.error(e);
            await handleErrorResponseToMessage(this.client, this.message, false, true, "Could not join voice channel. Is it full?");
            await this.finish();
            return;
        }

        this.currentSong = 0;
        this.scores = {};

        this.client.bahamut.runningGames.set(this.textChannel.guild.id, {
            "type": "musicquiz",
            "initiator": this.member,
            "obj": this,
        });

        this.startIntro();
        this.messageCollector = this.textChannel
            .createMessageCollector({ filter: (message: Message) => !message.author.bot })
            .on("collect", message => this.handleMessage(message));
    }

    async startIntro() {
        try {
            const res = await this.client.bahamut.musicHandler.manager.search(`${this.client.bahamut.config.website_link}/assets/bot_assets/games/musicquiz/countdown.mp3`);
            if (res.loadType === "LOAD_FAILED" || res.loadType === "NO_MATCHES") {
                logger.error(this.client.shardId, `MusicQuiz: Failed to load countdown.mp3 from url ${this.client.bahamut.config.website_link}/assets/bot_assets/games/musicquiz/countdown.mp3`);
                const err = createErrorResponse(this.client, "An internal error occurred while doing that. Please try again later.");
                if (!this.message) return err;
                await this.message.reply(err);
                this.finish();
            }

            this.player.queue.add(res.tracks[0], 0);
            this.player.play();

            handleResponseToMessage(this.client, this.message, false, true, {
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: "Music Quiz", iconURL: this.client.bahamut.config.game_icons.musicquiz })
                        .setDescription(`> The Quiz is starting in **5 seconds**!\n\n${this.pointText()}`),
                ],
            });

            // Map non latin song names to latin song names via genius api
            const temp = [];
            for (const s of this.songs!) {
                if (s.title.match(nonLatinReg) || s.author!.match(nonLatinReg)) {
                    const searchResult = await this.GeniusClient.songs.search(s.title);

                    if (searchResult === null || searchResult[0] === null || searchResult.length === 0) {
                        temp.push(s);
                        continue;
                    }

                    const [title, artist] = searchResult[0].fullTitle.split("by").map((e: string) => e.trim()),
                        titleSplit = title.split("("), artistSplit = artist.split("(");

                    temp.push({
                        ...s,
                        uri: s.uri,
                        title: (title.includes(s.title) ?
                            (title.includes("(") ?
                                (titleSplit[1].match(nonLatinReg) ?
                                    titleSplit[0].trim() :
                                    titleSplit[1].replace(")", "").trim()) :
                                title) :
                            s.title),
                        artist: (artist.includes(s.author!) ?
                            (artist.includes("(") ?
                                (artistSplit[1].match(nonLatinReg) ?
                                    artistSplit[0].trim() :
                                    artistSplit[1].replace(")", "").trim()) :
                                artist) :
                            s.author!),
                    });
                } else {
                    temp.push(s);
                }
            }
            this.songs = temp;
        } catch (e) {
            console.log("Error mapping non latin songs:", e);
            this.startPlaying();
        }
    }

    handlePlayEndEvents() {
        if (!this.player.get("running_music_quiz")) return;

        handleResponseToMessage(this.client, this.message, false, true, {
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: "Music Quiz", iconURL: this.client.bahamut.config.game_icons.musicquiz })
                    .setDescription(`You have one minute to guess each song.
                    ${this.pointText()}
                    Type \`${skipCommand}\` to vote for continuing to the next song.
                    Type \`${stopCommand}\` to stop the quiz.
                    `.replace(/  +/g, "")
                    ),
            ],
        }, undefined, false, !this._firstPlay);

        if (this._firstPlay) this._firstPlay = false;

        this.startPlaying();
    }

    handleNodeErrorEvents() {
        if (!this.player.get("running_music_quiz")) return;

        handleErrorResponseToMessage(this.client, this.message, false, true, "Connection got interrupted. Please try again");

        this.finish();
    }

    async startPlaying() {
        this.titleGuessed = false;
        this.artistGuessed = false;
        if (this.arguments.only.toLowerCase() === "artist") {
            this.titleGuessed = true;
        } else if (this.arguments.only.toLowerCase() === "title") {
            this.artistGuessed = true;
        }

        const song = this.songs![this.currentSong],
            songTitle = song.title,
            songAuthor = song.author;

        if (song.resolve) {
            await song.resolve();
            song.title = songTitle;
            song.author = songAuthor;
        }

        if (!song.uri) {
            this.nextSong("Could not find the song on Youtube. Skipping to next.");
            return;
        }

        this.songTimeout = setTimeout(() => {
            this.nextSong("Song was not guessed in time");
        }, 1000 * 60);

        try {
            if (song.title.match(nonLatinReg) || song.author!.match(nonLatinReg)) {
                await handleResponseToMessage(this.client, this.message, false, true, {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Note")
                            .setDescription("No title and/or artist in roman characters has been found for this song.\nIts title and/or artist may contain foreign characters (e.g. asian characters)!"),
                    ],
                });
            }

            // @ts-ignore
            this.player.setVolume(this.settings.music_volume);
            this.player.queue.add(song, 0);
            if (!this.player.playing) this.player.play();
        } catch (e) {
            console.error(e);

            handleErrorResponseToMessage(this.client, this.message, false, true, "Connection got interrupted. Please try again");

            this.finish();
        }
    }

    async handleMessage(message: Message) {
        const content = message.content.toLowerCase();
        if (content === stopCommand) {
            await this.printStatus("Quiz stopped!");
            await this.finish();
            return;
        }

        if (content === skipCommand) {
            await this.handleSkip(message.author.id);
            return;
        }

        const song = this.songs![this.currentSong];

        let score = this.scores![message.author.id] || 0;
        let correct = false;
        const titleSimilarity = similarText(content.toLowerCase(), latinize(song.title.toLowerCase()), true) / 100,
            artistSimilarity = similarText(content.toLowerCase(), latinize(song.author!.toLowerCase()), true) / 100;

        if (!this.titleGuessed && (content.toLowerCase().includes(latinize(song.title.toLowerCase())) || titleSimilarity > 0.75)) {
            score = score + 2;
            this.titleGuessed = true;
            correct = true;
            await this.reactToMessage(message, "☑");
        }
        if (!this.artistGuessed && (content.toLowerCase().includes(latinize(song.author!.toLowerCase())) || artistSimilarity > 0.75)) {
            score = score + 3;
            this.artistGuessed = true;
            correct = true;
            await this.reactToMessage(message, "☑");
        }
        this.scores![message.author.id] = score;

        if (this.titleGuessed && this.artistGuessed) {
            this.nextSong("Song guessed!");
        }

        if (!correct) {
            await this.reactToMessage(message, "❌");
        }
    }

    handleSkip(userID: string) {
        if (this.skippers.includes(userID)) {
            return;
        }

        this.skippers.push(userID);

        const members = this.voiceChannel.members.filter(member => !member.user.bot);
        if (this.skippers.length === members.size) {
            this.nextSong("Song skipped!");
            return;
        }

        handleResponseToMessage(this.client, this.message, false, true, `**(${this.skippers.length}/${members.size})** to skip the song`);
    }

    async finish() {
        if (this.songTimeout) clearTimeout(this.songTimeout);
        if (this.messageCollector) this.messageCollector.stop();
        if (this.player) this.player.destroy();

        this.client.bahamut.musicHandler.manager.removeListener("trackError", this.handlePlayEndEvents);
        this.client.bahamut.musicHandler.manager.removeListener("queueEnd", this.handlePlayEndEvents);
        this.client.bahamut.musicHandler.manager.removeListener("nodeError", this.handleNodeErrorEvents);

        // @ts-ignore
        for (const k of Object.keys(this.scores)) {
            const user = await resolveUser(this.client, k, this.guild);
            if (!user) continue;
            await this.client.bahamut.dbHandler.guildUserStat.addDBGuildUserStat(this.member.guild, user, "games_musicquiz_count", 1);
        }

        this.finished = true;
        this.player.set("running_music_quiz", false);

        this.client.bahamut.runningGames.delete(this.textChannel.id);
    }

    nextSong(status: string) {
        if (this.songTimeout) clearTimeout(this.songTimeout);
        this.printStatus(status);

        if (this.currentSong + 1 === this.songs!.length) {
            return this.finish();
        }

        this.currentSong++;
        this.skippers = [];
        if (this.player.playing) this.player.stop();
        // this.startPlaying();
    }

    async printStatus(message: string) {
        const song = this.songs![this.currentSong];
        handleResponseToMessage(this.client, this.message, false, true, {
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: "Music Quiz", iconURL: this.client.bahamut.config.game_icons.musicquiz })
                    .setDescription(` **(${this.currentSong + 1}/${this.songs!.length})** ${message}
                
                        > **${song.title}** by **${song.author}**
                        > Link: || ${song.uri} ||

                        **__SCORES__**
                        ${this.getScores()}
                `.replace(/  +/g, "")),
            ],
        }, undefined, false, !this._firstPlay);
    }

    getScores(): string {
        return Array.from(this.voiceChannel.members.filter(member => !member.user.bot).values())
            .sort((first, second) => (this.scores![first.id] || 0) < (this.scores![second.id] || 0) ? 1 : -1)
            .map((member, index) => {
                let position = `**${index + 1}.** `;
                if (index === 0) {
                    position = ":first_place:";
                } else if (index === 1) {
                    position = ":second_place:";
                } else if (index === 2) {
                    position = ":third_place:";
                }

                return `${position} <@!${member.id}> ${this.scores![member.id] || 0} points`;
            })
            .join("\n");
    }

    async reactToMessage(message: Message, emoji: string) {
        try {
            await message.react(emoji);
        } catch (e) {
            if (this.reactPermissionNotified) {
                return;
            }

            this.reactPermissionNotified = true;
            handleErrorResponseToMessage(this.client, this.message, false, true, `Please give me permission to react to messages.
                You can easily do this by clicking the following link and adding me to your server again.
                ${this.client.bahamut.config.invite_link}
            `.replace(/  +/g, ""),
            );
        }
    }

    async getSongs(playlists: string[], amount: number): Promise<UnresolvedTrack[] | null> {
        const spotify = new Spotify(this.client.bahamut.config.spotify_client_id, this.client.bahamut.config.spotify_client_secret);
        await spotify.authorize();
        let temp: any[] = [];

        for (let i = 0; i < playlists.length; i++) {
            if (playlists[i].includes("spotify.com/playlist")) {
                playlists[i] = playlists[i].match(/playlist\/([^?]+)/)![1] || playlists[i];
            }

            try {
                temp = temp.concat((await spotify.getPlaylist(playlists[i], amount))
                    .sort(() => Math.random() > 0.5 ? 1 : -1)
                    .filter((song:any, index: number) => index < amount));
            } catch (error) {
                // eslint-disable-next-line no-useless-escape
                handleErrorResponseToMessage(this.client, this.message, false, true, "Could not retrieve the playlist. Make sure it\'s public");
            }
        }

        try {
            temp = temp.sort(() => Math.random() > 0.5 ? 1 : -1)
                .filter((song, index) => index < amount);

            const t2 = await Promise.all(temp.map(async (song) => {
                const res = (await this.client.bahamut.musicHandler.manager.search(`https://open.spotify.com/track/${song.id}`));
                if (res.loadType === "LOAD_FAILED" || res.loadType === "NO_MATCHES") return null;

                return res.tracks[0];
            }));

            // @ts-ignore
            return t2;
        } catch (error) {
            // eslint-disable-next-line no-useless-escape
            handleErrorResponseToMessage(this.client, this.message, false, true, "Could not retrieve the playlist. Make sure it\'s public");
            return null;
        }
    }

    /*
        async findSong(song: UnresolvedTrack): Promise<Track> {
            try {
                song.resolve();
                return song;
            } catch (e) {
                await handleBotMessage(this.client, this.message, "error", `Oh no... Youtube police busted the party :(\nPlease try again later.`)
                this.finish()
                throw e
            }
        }
    */
    /**
     * Will remove all excess from the song names
     * Examples:
     * death bed (coffee for your head) (feat. beabadoobee) -> death bed
     * Dragostea Din Tei - DJ Ross Radio Remix -> Dragostea Din Tei
     *
     * @param name string
     */
    stripSongName(name: string): string {
        return name.replace(/ \(.*\)/g, "")
            .replace(/ - .*$/, "");
    }

    pointText(): string {
        if (this.arguments.only === "artist") {
            return "Guess the artist of the song by typing in chat. When guessed correctly you are awarded **3 points**.";
        }

        if (this.arguments.only === "title") {
            return "Guess the title of the song by typing in chat. When guessed correctly you are awarded **2 points**.";
        }

        return `
            Guess the song and artist by typing in chat. Points are awarded as follows:
            > Artist - **3 points**
            > Title - **2 points**
            > Artist + title - **5 points**
        `.replace(/  +/g, "");
    }
}