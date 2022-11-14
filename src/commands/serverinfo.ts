import BahamutClient from "../modules/BahamutClient";
import { numberWithCommas, toProperCase } from "../lib/toolFunctions";
import { DateTime } from "luxon";
import ISO6391 from "iso-639-1";
import Discord from "discord.js";
import { CommandConfig } from "../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import { getGuildSettings } from "../lib/getFunctions";
import { handleResponseToMessage } from "../lib/messageHandlers";

const config: CommandConfig = {
    name: "serverinfo",
    aliases: ["server-info", "server"],
    type: CommandType.BOTH,
    description: "Gives some useful information of the server",
    category: "System",
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
    callback: async ({ client, message, channel, interaction, member }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, interaction: Discord.CommandInteraction, member: Discord.GuildMember }) => {
        const guildUserStats = await client.bahamut.dbHandler.guildUserStat.getDBGuildUserStats(channel.guild, member, ["played_songs", "cookies"]),
            guildCommandCount = await client.bahamut.dbHandler.commandLog.getDBGuildCommandLogCount(channel.guild),
            serverCreatedDate = DateTime.fromMillis(channel.guild.createdTimestamp), botJoinedDate = DateTime.fromMillis(channel.guild.members.me?.joinedTimestamp!),
            settings = await getGuildSettings(client, channel.guild);

        const data = (await client.shard!.broadcastEval((_client: BahamutClient) => {
            return _client.shardId;
        }));

        if (settings.language !== "en") {
            serverCreatedDate.setLocale(settings.language);
            botJoinedDate.setLocale(settings.language);
        }

        const serverCreatedDateString = settings.time_format_24h ? serverCreatedDate.toFormat("dd LLL yyyy") : serverCreatedDate.toLocaleString(DateTime.DATE_MED),
            botJoinedDateString = settings.time_format_24h ? botJoinedDate.toFormat("dd LLL yyyy") : botJoinedDate.toLocaleString(DateTime.DATE_MED);

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: `Server: ${channel.guild.name}`, iconURL: client.bahamut.config.message_icons.info })
                    .setDescription(`Created on: \`${serverCreatedDateString} (${serverCreatedDate.toRelative()})\`.\nBot joined on: \`${botJoinedDateString} (${botJoinedDate.toRelative()})\`.`)
                    .setThumbnail(channel.guild.iconURL())
                    .setFields(
                        // @ts-ignore
                        { name: `<:crown:${client.bahamut.config.status_emojis.crown}> Owner`, value: channel.guild.members.cache.get(channel.guild.ownerId)?.toString(), inline: false },
                        { name: `<:user:${client.bahamut.config.status_emojis.user}> Members`, value: numberWithCommas(channel.guild.memberCount), inline: true },
                        { name: `<:stack:${client.bahamut.config.status_emojis.stack}> Shard`, value: `${client.shardId + 1}/${data.length}`, inline: true },
                        // eslint-disable-next-line no-useless-escape
                        { name: `<:heart:${client.bahamut.config.status_emojis.heart}> Premium`, value: `${settings.premium_user ? "\:white_check_mark: Yes" : "\:x: No"}`, inline: true },
                        { name: `<:region:${client.bahamut.config.status_emojis.region}> Language`, value: (channel.guild.preferredLocale ?
                                (ISO6391.getName(channel.guild.preferredLocale.split("-")[0]) ? ISO6391.getName(channel.guild.preferredLocale.split("-")[0]) : toProperCase(channel.guild.preferredLocale.toString())) :
                                "N/A"), inline: true },
                        { name: `<:console:${client.bahamut.config.status_emojis.console}> Commands`, value: (guildCommandCount ? numberWithCommas(guildCommandCount + 1) : "1"), inline: true },
                        // eslint-disable-next-line no-useless-escape
                        { name: "\:cookie: Cookies", value: (guildUserStats && guildUserStats.has("cookies") ? (guildUserStats.has("cookies") ? numberWithCommas(guildUserStats.get("cookies")?.val || 0) : "0") : "0"), inline: true },
                        { name: `<:toolbox:${client.bahamut.config.status_emojis.toolbox}> Settings`, value: `Prefix: \`${settings.prefix}\``, inline: true },
                        // eslint-disable-next-line no-useless-escape
                        { name: "\:headphones: DJ", value: (settings.music_dj_role ? channel.guild.roles.resolve(settings.music_dj_role)?.toString() : "Not set"), inline: true },
                        { name: `<:cancel:${client.bahamut.config.status_emojis.cancel}> Ignored Channels`, value: "NaN", inline: true },
                    ),
            ],
        });
    },
};