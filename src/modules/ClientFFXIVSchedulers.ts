import { EmbedBuilder, Message } from "discord.js";
import logger from "./Logger";
import { Bahamut } from "../bahamut";
import { resolve } from "path";

export default class ClientFFXIVSchedulers {
    _bahamut: Bahamut;

    constructor(client: Bahamut) {
        this._bahamut = client;

        // Lodestone check every 10 minutes
        this._bahamut.scheduler.scheduleJob("*/10 * * * *", async () => {
            try {
                const settings = await this._bahamut.dbHandler.guildSettings.getDBGuildSettings("global");

                // if this client has access to lodestone source channel
                if (!this._bahamut.client.channels.cache.has(this._bahamut.client.bahamut.config.ffxiv_settings.lodestone_source_channel)) return;

                logger.log(this._bahamut.client.shardId, "Running lodestone news scheduler.");

                // @ts-ignore
                const messages = await this._bahamut.client.channels.cache.get(this._bahamut.config.ffxiv_settings.lodestone_source_channel)!.messages.fetch({ after: settings.lastLodestoneNews });
                // Abort of no messages found
                if (!messages || messages.length < 1) return;

                const data: Message[] = [...messages.values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp).filter((e) => e.embeds && e.embeds.length > 0);
                // If no message retrieved abort
                if (!data || data.length < 1) return;

                // @ts-ignore
                logger.log(this._bahamut.client.shardId, `Newest post id is ${data[0].id}, last post id is ${settings.lastLodestoneNews}`);

                const sendMessages = [];
                for (const e of data.slice().reverse()) {
                    // skip if message has no embeds
                    if (!e.embeds || e.embeds.length < 1) continue;

                    const embeds = [];
                    for (const ee of e.embeds) {
                        const embed = new EmbedBuilder(ee.data);
                        if (embed) {
                            // @ts-ignore
                            embed.setColor(this._bahamut.config.primary_message_color);
                            embed.setThumbnail(null);

                            embeds.push(embed.toJSON());
                        }
                    }

                    if (embeds.length > 0) sendMessages.push({ embeds: embeds });
                }

                // Abort if no messages to send
                if (sendMessages.length < 1) return;

                await this._bahamut.client.shard!.broadcastEval(async (_client, obj) => {
                    // If no messages to send, abort
                    if (obj.sendMessages.length < 1) return;

                    // eslint-disable-next-line no-shadow
                    const { getGuildSettings } = require(obj.rootPath + "/lib/getFunctions");

                    // eslint-disable-next-line no-unused-vars
                    for (const [, guild] of this._bahamut.client.guilds.cache) {
                        const guild_settings = await getGuildSettings(this._bahamut.client, guild);

                        // Skip of guild has no lofestone news channel set
                        if (!guild_settings.ffxiv_lodestone_news_channel || !guild.channels.cache.has(guild_settings.ffxiv_lodestone_news_channel)) continue;
                        const lodestone_channel = guild.channels.cache.get(guild_settings.ffxiv_lodestone_news_channel);

                        if (!lodestone_channel) return null;

                        try {
                            for (const m of obj.sendMessages) {
                                // @ts-ignore
                                await lodestone_channel.send(m);
                            }
                        } catch (ex) {
                            console.error("Unable to post to lodestone channel:", ex);
                        }
                    }
                }, { context: { sendMessages: sendMessages, rootPath: resolve(__dirname, "..") } });

                // Update last fashion report
                await this._bahamut.client.bahamut.dbHandler.guildSettings.setDBGuildSetting("global", "lastLodestoneNews", data[0].id);
            } catch (ex) {
                console.error(ex);
            }
        });
    }
}