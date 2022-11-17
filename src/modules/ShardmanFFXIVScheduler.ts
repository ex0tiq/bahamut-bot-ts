import scheduler, { Job } from "node-schedule";
import logger from "./Logger";
import axios from "axios";
import { BahamutShardingBootManager } from "../../typings";
import { DateTime } from "luxon";

export default class ShardManFFXIVSchedulers {
    private _shardMan;

    // Set node-schedule object
    private _scheduler: typeof scheduler = scheduler;
    private _schedules: Map<string, Job> = new Map<string, Job>;

    constructor(shardMan: BahamutShardingBootManager) {
        this._shardMan = shardMan;
        /*
        this.reddit = new snoowrap({
            userAgent: this._shardMan.config.reddit.userAgent,
            clientId: this._shardMan.config.reddit.appid,
            clientSecret: this._shardMan.config.reddit.secret,
            refreshToken: this._shardMan.config.reddit.refreshToken,
        });
        this.reddit.config({ debug: true});
        */

        // Fashion Report check every 30 minutes
        scheduler.scheduleJob("*/30 * * * *", async () => {
            try {
                logger.log("SM", "Running fashion report scheduler.");

                const settings = await this._shardMan.dbHandler.getDBGuildSettings("global");
                /*
                    res = await this.reddit.getSubreddit('ffxiv').search({
                        'query': 'author:kaiyoko title:Fashion Report - Full Details',
                        'sort': 'new',
                        'limit': 3,
                    });*/
                let res = await axios.request({
                    url: "https://reddit.com/r/ffxiv/search.json",
                    params: {
                        "q": "author:kaiyoko title:Fashion Report - Full Details",
                        "sort": "new",
                        "limit": 3,
                    },
                });

                if (res && res.data) res = res.data;
                else return;

                if (res && res.data && res.data.children) res = res.data.children.map((e: { data: any; }) => e.data);
                else return;

                // Abort if no post found
                if (!res || !Array.isArray(res) || res.length <= 0) return;
                // Abort if post title does not match fashion report schema
                if (!res[0].title.toLowerCase().match(/.*Fashion Report - Full Details.*/gi)) return;
                // Abort current check if no new fashion report found
                // @ts-ignore
                if ((res[0] && res[0].id) && (settings && settings.lastFashionReport && settings.lastFashionReport === res[0].id)) return;

                const date = res[0].title.match(/\d{1,2}\/\d{1,2}\/\d{1,4}/);
                // @ts-ignore
                if (Array.isArray(date) && date.length > 0 && (settings && settings.lastFashionReportDate && settings.lastFashionReportDate === date[0])) return;
                // @ts-ignore
                if (settings && settings.lastFashionReportDate && (DateTime.fromFormat(date[0], "M/d/yyyy") <= DateTime.fromFormat(settings.lastFashionReportDate, "M/d/yyyy"))) return;

                await this._shardMan.broadcastEval(async (_client, obj) => {
                    // eslint-disable-next-line no-unused-vars
                    for (const [, guild] of _client.guilds.cache) {
                        const { getGuildSettings } = require("../lib/getFunctions");

                        const guild_settings = await getGuildSettings(_client, guild),
                            // eslint-disable-next-line no-shadow
                            { EmbedBuilder } = require("discord.js");

                        if (!guild_settings.ffxiv_fashion_report_channel || !guild.channels.cache.has(guild_settings.ffxiv_fashion_report_channel)) continue;
                        const fashionreport_channel = guild.channels.cache.get(guild_settings.ffxiv_fashion_report_channel);

                        if (obj.post) {
                            await fashionreport_channel.send({ embeds: [(new EmbedBuilder()
                                        .setTitle(obj.post.title)
                                        .setColor(obj.config.primary_message_color)
                                        .setImage(obj.post.url)
                                        .setURL("https://reddit.com" + obj.post.permalink)
                                )] });
                        }
                    }
                }, { context: { post: res[0], config: this._shardMan.config } });

                // Update last fashion report
                await this._shardMan.dbHandler.setDBGuildSetting("global", "lastFashionReport", res[0].id);
                if (Array.isArray(date) && date.length > 0) await this._shardMan.dbHandler.setDBGuildSetting("global", "lastFashionReportDate", date[0]);
            } catch (ex) {
                console.error(ex);
            }
        });
    }
}