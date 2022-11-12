import { numberWithCommas } from "../lib/toolFunctions";
import { resolveUser } from "../lib/resolveFunctions";
import moment from "moment";
import Discord from "discord.js";
import { CommandConfig } from "../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../modules/BahamutClient";
import { handleResponseToMessage } from "../lib/messageHandlers";

require("moment-duration-format")(moment);

const config: CommandConfig = {
    name: "userinfo",
    aliases: ["user-info", "user"],
    type: CommandType.BOTH,
    description: "Gives some useful information about a user.",
    category: "System",
    maxArgs: 1,
    expectedArgs: "[user]",
    options: [
        {
            name: "user",
            description: "Request data for this user.",
            type: 6,
            required: false,
        },
    ],
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    // eslint-disable-next-line no-unused-vars
    callback: async ({ client, member, message, channel, args, interaction }: { client: BahamutClient, member: Discord.GuildMember, message: Discord.Message, channel: Discord.TextChannel, args: any[], interaction: Discord.CommandInteraction }) => {
        let target;

        if (args.length > 0) {
            if (message && message.mentions.members!.size > 0) {
                target = message.mentions.members?.first();
            }
            else if (!message && args.length > 0) {
                if (args[0] instanceof Discord.GuildMember) {
                    target = args[0];
                }
                else {
                    target = await resolveUser(client, args[0], channel.guild);
                }
            }
            else {
                target = member;
            }
        }
        else {
            target = member;
        }

        const userCreateDate = moment(target!.user.createdTimestamp), userJoinedDate = moment(target!.joinedTimestamp),
            guildUserStats = await client.bahamut.dbHandler.guildUserStat.getDBGuildUserStats(channel.guild, target!, ["played_songs", "cookies", "games_hangman_count", "games_musicquiz_count", "games_triviaquiz_count"]),
            userCommandount = await client.bahamut.dbHandler.commandLog.getDBUserCommandLogCount(channel.guild, target!),
            userMaxPremiumServers = await client.bahamut.premiumHandler.getUserMaxPremiumServers(target!);


        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: `User: ${target!.user.tag}`, iconURL: client.bahamut.config.message_icons.info })
                    .setDescription(`${target!.user.bot ? "This user is a bot. 🤖\n\n" : ""}Display Name: \`${target!.displayName}\`\n
			User created on: \`${userCreateDate.format("DD MMM YYYY")} (${userCreateDate.fromNow()})\`.
			Joined server on: \`${userJoinedDate.format("DD MMM YYYY")} (${userJoinedDate.fromNow()})\``)
                    .setThumbnail(target!.user.avatarURL())
                    .setFields(
                        { name: `<:heart:${client.bahamut.config.status_emojis.heart}> Premium User`, value: `${((userMaxPremiumServers !== null && userMaxPremiumServers > 0) || (userMaxPremiumServers !== null && userMaxPremiumServers === -1)) ? "Yes" : "No"}`, inline: true },
                        { name: `<:thumbsup:${client.bahamut.config.status_emojis.thumbsup}> Votes`, value: "NaN", inline: true },
                        { name: "\u200B", value: "\u200B", inline: true },
                        { name: `<:console:${client.bahamut. config.status_emojis.console}> Commands`, value: (userCommandount ? numberWithCommas(userCommandount + 1) : "0"), inline: true },
                        { name: `<:music:${client.bahamut.config.status_emojis.music}> Songs played`, value: (guildUserStats?.get("played_songs")) ? numberWithCommas(guildUserStats.get("played_songs")!) : "0", inline: true },
                        // eslint-disable-next-line no-useless-escape
                        { name: "\:cookie: Cookies", value: (guildUserStats?.get("cookies")) ? numberWithCommas(guildUserStats.get("cookies")!) : "0", inline: true },
                        // Game stats
                        { name: `<:game_musicquiz:${client.bahamut.config.status_emojis.game_musicquiz}> Music Quizzes`, value: (guildUserStats?.get("games_musicquiz_count")) ? numberWithCommas(guildUserStats.get("games_musicquiz_count")!) : "0", inline: true },
                        { name: `<:game_hangman:${client.bahamut.config.status_emojis.game_hangman}> Hangman Rounds`, value: (guildUserStats?.get("games_hangman_count")) ? numberWithCommas(guildUserStats.get("games_hangman_count")!) : "0", inline: true },
                        { name: `<:game_triviaquiz:${client.bahamut.config.status_emojis.game_triviaquiz}> Trivia Quizzes`, value: (guildUserStats?.get("games_triviaquiz_count")) ? numberWithCommas(guildUserStats.get("games_triviaquiz_count")!) : "0", inline: true },
                    ),
            ],
        });
    },
};