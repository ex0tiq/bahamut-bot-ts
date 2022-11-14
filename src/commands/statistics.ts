import { DateTime } from "luxon";
import humanize from "humanize-duration";
import { numberWithCommas } from "../lib/toolFunctions";
import osu from "node-os-utils";
import Discord from "discord.js";
import { CommandConfig } from "../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../modules/BahamutClient";
import { createResponseToMessage, handleResponseToMessage } from "../lib/messageHandlers";
import { getGuildSettings } from "../lib/getFunctions";

// Non ES imports
const cpu = require("cpu-stat");

const config: CommandConfig = {
    name: "statistics",
    aliases: ["stats", "stat"],
    type: CommandType.BOTH,
    description: "Gives some useful bot statistics",
    category: "System",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

const fetchBotStatistics = async (client: BahamutClient, guild: Discord.Guild, data: any[], duration: string, mem: osu.MemUsedInfo, pack: any, createdTimestamp: number) => {
    const botStats = await client.bahamut.dbHandler.guildUserStat.getDBGuildUserStats(guild, null, ["played_songs"]),
        commandCount = await client.bahamut.dbHandler.commandLog.getDBFullCommandLogCount();

    return createResponseToMessage(client, {
        embeds: [
            new Discord.EmbedBuilder()
                .setAuthor({ name: `${client.user!.username} Statistics`, iconURL: client.bahamut.config.message_icons.info })
                .setFields(
                    { name: `<:toolbox:${client.bahamut.config.status_emojis.toolbox}> Version`, value: `\`\`\`${client.user!.username}: ${pack.version!}\nDiscord.js: ${Discord.version}\`\`\``, inline: true },
                    { name: `<:cpu:${client.bahamut.config.status_emojis.cpu}> CPU Usage`, value: `\`\`\`${(await osu.cpu.usage())}%\n${osu.cpu.count()} cores @ ${(cpu.avgClockMHz() / 1000).toFixed(2)} GHz\`\`\``, inline: true },
                    { name: `<:memory:${client.bahamut.config.status_emojis.memory}> Mem Usage`, value: `\`\`\`${(mem.usedMemMb / 1024).toFixed(1)} / ${(mem.totalMemMb / 1024).toFixed(1)} GB\n${((mem.usedMemMb / mem.totalMemMb) * 100).toFixed(2)}% used\`\`\``, inline: true },
                    { name: `<:time_span:${client.bahamut.config.status_emojis.timespan}> Uptime`, value: `\`\`\`${duration}\`\`\``, inline: true },
                    { name: `<:time_machine:${client.bahamut.config.status_emojis.timemachine}> Uptime %`, value: "```NaN```", inline: true },
                    { name: `<:api:${client.bahamut.config.status_emojis.api}> WebSocket Ping`, value: `\`\`\`${Math.round(client.ws.ping)}ms\`\`\``, inline: true },
                    { name: `<:signal:${client.bahamut.config.status_emojis.signal}> API Ping`, value: `\`\`\`${Date.now() - createdTimestamp}ms\`\`\``, inline: true },
                    { name: `<:console:${client.bahamut.config.status_emojis.console}> Commands served`, value: `\`\`\`${(commandCount) ? numberWithCommas(commandCount) : "1"}\`\`\``, inline: true },
                    { name: `<:music:${client.bahamut.config.status_emojis.music}> Songs played`, value: `\`\`\`${(botStats && botStats.get("played_songs")) ? numberWithCommas(botStats.get("played_songs") || 1) : "1"}\`\`\``, inline: true },
                    { name: `<:play:${client.bahamut.config.status_emojis.play}> Current Streams`, value: `\`\`\`${data.reduce((a, g) => a + g.playingMusicQueues, 0)}/${data.reduce((a, g) => a + g.totalMusicQueues, 0)}\`\`\``, inline: true },
                    { name: `<:user:${client.bahamut.config.status_emojis.user}> Users`, value: `\`\`\`${numberWithCommas(data.reduce((a, g) => a + g.membersTotal, 0))}\`\`\``, inline: true },
                    { name: `<:servers:${client.bahamut.config.status_emojis.servers}> Servers`, value: `\`\`\`${numberWithCommas(data.reduce((a, g) => a + g.guildCount, 0))}\`\`\``, inline: true },
                    { name: `<:stack:${client.bahamut.config.status_emojis.stack}> Shards`, value: `\`\`\`${data.length}\`\`\``, inline: true },
                ),
        ],
    });
};

export default {
    ...config,
    // eslint-disable-next-line no-unused-vars
    callback: async ({ client, message, guild, interaction }: { client: BahamutClient, message: Discord.Message, guild: Discord.Guild, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, guild);

        const data = (await client.shard!.broadcastEval((_client: BahamutClient) => {
                return {
                    shardId: _client.shardId,
                    guildCount: _client.guilds.cache.size,
                    membersTotal: _client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                    ramUsage: process.memoryUsage().heapUsed / 1024 / 1024,
                    totalMusicQueues: _client.bahamut.musicHandler.manager.players.size,
                    playingMusicQueues: _client.bahamut.musicHandler.manager.players.reduce((a, q) => a + ((q.playing || !q.paused) ? 1 : 0), 0),
                };
                // @ts-ignore
            })), duration = humanize(DateTime.now().minus(client.uptime).diff(DateTime.now()).as("milliseconds"), { language: settings.language, round: true }),
            mem = await osu.mem.used();
        const pack = require("../../package.json");

        handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            // eslint-disable-next-line no-useless-escape
            content: "\:hourglass: Please wait, collecting data...",
        }).then(async msg => {
            // TODO Check why timestamp is minus
            const stats = await fetchBotStatistics(client, guild, data, duration, mem, pack, (message || interaction).createdTimestamp);

            await handleResponseToMessage(client, msg, true, config.deferReply, stats);
        });
    },
};