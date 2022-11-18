import { MusicQuiz } from "../../lib/game_classes/music_quiz/music-quiz";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import {
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers";
import BahamutClient from "../../modules/BahamutClient";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";
import { getGuildSettings } from "../../lib/getFunctions";
import { toProperCase } from "../../lib/toolFunctions";
// Non ES imports
const playlists = require("../../../assets/games/musicquiz/genre_playlists.json");
const genres = (() => Object.keys(playlists).sort((a, b) => a.localeCompare(b)))();

const config: CommandConfig = {
    name: "musicquiz",
    aliases: ["music-quiz", "mquiz"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Play a music quiz.",
    minArgs: 1,
    expectedArgs: "[action]",
    options: [
        {
            name: "action",
            description: "List/Stop or music category",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
    ],
    category: "Games",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    autocomplete: () => {
        return ["List", "Stop"].concat(genres.map(e => toProperCase(e)));
    },
    callback: async ({ client, message, channel, args, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], interaction: Discord.CommandInteraction, member: Discord.GuildMember }) => {
        let checks = new BahamutCommandPreChecker(client, {
            client,
            message,
            channel,
            args,
            interaction,
        }, config, [
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
        ]);
        if (await checks.runChecks()) return;

        const settings = await getGuildSettings(client, channel.guild);

        if (args.length === 0 || (args.length === 1 && args[0].toLowerCase() === "list")) {
            let genre_text = "";
            for (let i = 0; i < genres.length; i++) {
                if (i < (genres.length - 1)) {
                    genre_text += `• ${genres[i].trim()}\n`;
                } else {
                    genre_text += `• ${genres[i].trim()}`;
                }
            }

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({ name: "Music Quiz", iconURL: client.bahamut.config.game_icons.musicquiz })
                        .setDescription(`The following music quiz genres are available:\n\n• all (random songs from every genre)\n${genre_text}`),
                ],
            });
        } else if (args.length === 1 && args[0].toLowerCase() === "stop") {
            if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length <= 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a no active music quiz on this server.");

            if (client.bahamut.runningGames.get(channel.guild.id)!.obj.finished) client.bahamut.runningGames.delete(channel.guild.id);
            else {
                await client.bahamut.runningGames.get(channel.guild.id)!.obj.printStatus("Quiz stopped!");
                await client.bahamut.runningGames.get(channel.guild.id)!.obj.finish();
                client.bahamut.runningGames.delete(channel.guild.id);
            }
            return;
        }

        checks = new BahamutCommandPreChecker(client, {
            client,
            message,
            channel,
            args,
            member,
            interaction,
        }, config, [
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

        if (client.bahamut.musicHandler.manager.players.has(channel.guild.id)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is music playing at the moment. Please stop it before starting a music quiz!");
        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it before playing music.");
        // eslint-disable-next-line no-useless-escape
        if (!genres.includes(args[0].toLowerCase()) && args[0].toLowerCase() !== "all") return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Invalid genre provided. Please see \`musicquiz list\` for a list of all available genres!");

        try {
            const pls = [];
            if (args[0].toLowerCase() === "all") {
                for (const g of genres) {
                    pls.push(playlists[g][0]);
                }
            } else {
                for (const pl of playlists[args[0].toLowerCase()]) {
                    pls.push(pl);
                }
            }

            client.bahamut.runningGames.set(channel.guild.id, {
                "type": "musicquiz",
                "initiator": member,
                "obj": new MusicQuiz(client, message || interaction, channel, member, {
                    "playlists": pls,
                    "songs": "15",
                    "only": "both",
                }, settings),
            });
            return client.bahamut.runningGames.get(channel.guild.id)!.obj.start();
        } catch (e) {
            console.error("Error while starting music quiz:", e);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while running this command. Please try again later.");
        }
    },
};