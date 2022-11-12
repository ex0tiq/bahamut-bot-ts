import { numberWithCommas } from "../lib/toolFunctions";
import { CommandConfig } from "../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../modules/BahamutClient";
import Discord from "discord.js";
import { handleResponseToMessage } from "../lib/messageHandlers";

const moment = require("moment");

const config: CommandConfig = {
    name: "shards",
    aliases: ["shard"],
    type: CommandType.BOTH,
    description: "Get infos about the current bot shards",
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
    callback: async ({ client, message, interaction }: { client: BahamutClient, message: Discord.Message, interaction: Discord.CommandInteraction }) => {
        const date = Date.now();

        const data = (await client.shard!.broadcastEval(() => {
            return {
                // @ts-ignore
                shardId: this.shardId,
                // @ts-ignore
                guildCount: this.guilds.cache.size,
                // @ts-ignore
                membersTotal: this.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                ramUsage: process.memoryUsage().heapUsed / 1024 / 1024,
                // @ts-ignore
                uptime: this.uptime,
                time: Date.now(),
                // @ts-ignore
                totalMusicQueues: this.bahamut.musicHandler.manager.players.size,
                // @ts-ignore
                playingMusicQueues: this.bahamut.musicHandler.manager.players.reduce((a, q) => a + ((q.playing || !q.paused) ? 1 : 0), 0),
            };
        })).sort((a, b) => a.shardId - b.shardId);

        const embed = new Discord.EmbedBuilder()
            .setAuthor({ name: `${client.user!.username} Shards`, iconURL: client.bahamut.config.message_icons.info })
            .setDescription(`This server is running on shard \`${client.shardId + 1}/${client.shard!.count}\`.`);

        embed.addFields({ name: "Summary", value: `\`\`\`
Servers: ${numberWithCommas(data.reduce((a, g) => a + g.guildCount, 0))}
Users: ${numberWithCommas(data.reduce((a, g) => a + g.membersTotal, 0))}
Memory: ${data.reduce((a, g) => a + g.ramUsage, 0).toFixed(2)} MB
Avg. Heartbeat: ${(data.reduce((a, g) => a + (g.time - date), 0) / data.length).toFixed(0)}ms
Streams: ${data.reduce((a, g) => a + g.playingMusicQueues, 0)}/${data.reduce((a, g) => a + g.totalMusicQueues, 0)}\`\`\``, inline: false });

        for (const shard of data) {
            embed.addFields({ name: `<:online:${client.bahamut.config.status_emojis.online}> Shard ${shard.shardId + 1}`, value: `\`\`\`
Servers: ${numberWithCommas(shard.guildCount)}
Users: ${numberWithCommas(shard.membersTotal)}
Memory: ${shard.ramUsage.toFixed(2)} MB
Heartbeat: ${shard.time - date}ms
Streams: ${shard.playingMusicQueues}/${shard.totalMusicQueues}
Uptime: ${moment.duration(shard.uptime).format(" D [days], H [hrs], m [mins], s [secs]")}\`\`\``, inline: true });
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [embed], 
        });
    },
};