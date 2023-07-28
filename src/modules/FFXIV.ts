import { Bahamut } from "../bahamut.js";
import axios from "axios";
import { promises as fs } from "fs";
import fsExists from "fs.promises.exists";
import fse from "fs-extra";
import { resolve } from "path";
import { DateTime } from "luxon";
import logger from "./Logger.js";
// @ts-ignore
import XIVAPI from "@xivapi/js";

export default class FFXIV {
    private _bahamut: Bahamut;
    
    constructor(bahamut: Bahamut) {
        this._bahamut = bahamut;

        const self = this;

        this.cacheFFXIVServers();
        this.cacheAllAchievements();

        // start auto server refresh scheduler, every 24 hours
        this._bahamut.schedules.set("ffxivServerUpdateScheduler", this._bahamut.scheduler.scheduleJob("0 0 * * *", async function() {
            await self.cacheFFXIVServers();
        }));

        // start auto achievement refresh scheduler, every 6 hours
        this._bahamut.schedules.set("achievementUpdateScheduler", this._bahamut.scheduler.scheduleJob("0 1 * * *", async function() {
            await self.cacheAllAchievements();
        }));
    }

    supported_languages = ["de", "en"];

    cacheFFXIVServers = async () => {
        const xiv = new XIVAPI({
            private_key: this._bahamut.config.xivapi_token,
        });
        const servers = (await xiv.data.servers());
        const path = resolve("cache/ffxiv_servers.json");

        if (await fsExists(path) && (DateTime.now().diff(DateTime.fromJSDate((await fs.stat(path)).mtime), "hours")).as("hours") < 24) {
            return true;
        }

        try {
            await fse.outputFile(path, JSON.stringify(servers));
        } catch (err) {
            console.error("Error caching FFXIV Servers:", err);
            return null;
        }

        logger.log(this._bahamut.client.shardId, `Updated local cache for servers: ${path}`);
        return true;
    };

    cacheAllAchievements = async () => {
        for (const l of this.supported_languages) {
            await this.cacheAchievements(l);
        }
    };

    cacheAchievements = async (language: string = "en") => {
        if (!this.supported_languages.includes(language.toLowerCase())) {
            return false;
        }

        const link = `https://xivapi.com/Achievement?limit=3000&private_key=${this._bahamut.config.xivapi_token}&language=${language}`;
        let achievements: any[] = [], temp = null;

        try {
            const path = resolve(`cache/ffxiv_achievements_${language}.json`);

            if (await fsExists(path) && (DateTime.now().diff(DateTime.fromJSDate((await fs.stat(path)).mtime), "hours")).as("hours") < 24) {
                return true;
            }

            let i = 1;

            do {
                temp = await axios(`${link}&page=${i}`);
                temp = temp.data;

                if (temp.Error) {
                    console.error("Error requesting FFXIV achievements:", temp.message);
                    continue;
                }

                achievements = achievements.concat(temp);
                i++;
                // @ts-ignore
            } while(i < temp.Pagination.PageTotal);

            const obj: { [key: string]: object } = {};
            for (const o of achievements) {
                obj[o.ID] = o;
            }

            try {
                await fse.outputFile(path, JSON.stringify(obj));
            } catch (err) {
                console.error("Error caching FFXIV Achievements:", err);
                return null;
            }

            logger.log(this._bahamut.client.shardId, `Updated local cache for achievements: ${path}`);
            return true;
        } catch (err) {
            console.error("Error caching FFXIV Achievements:", err);
            return null;
        }
    };

    getAchievements = async (language: string = "en") => {
        const path = resolve(`cache/ffxiv_achievements_${language}.json`);

        if (await fsExists(path) && (DateTime.now().diff(DateTime.fromJSDate((await fs.stat(path)).mtime), "hours")).as("hours") >= 24) {
            if (!(await this.cacheAchievements(language))) {
                return {};
            }
        }

        let content;
        try {
            content = await fs.readFile(path, "utf8");
            content = JSON.parse(content);
        } catch(err) {
            console.error("Error reading or parsing FFXIV achievement cache file:", err);
            return {};
        }

        return content;
    };
}