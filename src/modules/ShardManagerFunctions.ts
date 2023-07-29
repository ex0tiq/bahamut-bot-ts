import BahamutShardingManager from "./BahamutShardingManager.js";
import BahamutClient from "./BahamutClient.js";
import { getUserGuilds, getGuildDetails } from "../lib/getFunctions.js";

export default class ShardManagerFunctions {
    private _manager: BahamutShardingManager;

    constructor(manager: BahamutShardingManager) {
        this._manager = manager;
    }

    getShardData = async () => {
        return (await this._manager.broadcastEval((_client: BahamutClient) => {
            return {
                shardId: _client.shardId,
                guildCount: _client.guilds.cache.size,
                membersTotal: _client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                channelCount: _client.channels.cache.size,
                ramUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                uptime: _client.uptime,
                time: Date.now(),
                totalMusicQueues: _client.bahamut.musicHandler.manager.players.size,
                playingMusicQueues: Array.from(_client.bahamut.musicHandler.manager.players.values()).reduce((a, q) => a + ((q.playing || !q.paused) ? 1 : 0), 0),
            };
        })).sort((a, b) => a.shardId - b.shardId);
    };

    getShardStats = async () => {
        const data: { localTime: number, startupTime: number, shards: any[] } = {
            localTime: Date.now(),
            startupTime: this._manager.startTime,
            shards: [],
        };

        const temp = (await this._manager.broadcastEval((_client: BahamutClient) => {
            return {
                shardId: _client.shardId,
                guildCount: _client.guilds.cache.size,
                membersTotal: _client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                channelCount: _client.channels.cache.size,
                uptime: _client.uptime,
                time: Date.now(),
            };
        }));
        for (const t of temp) {
            data["shards"].push(t.shardId, t);
        }
        temp.sort((a, b) => a.shardId - b.shardId);

        data["shards"] = temp;
        return data;
    };
/*
    getCommandReference = async () => {
        let data = (await this._manager.broadcastEval((_client: BahamutClient) => {
            if (!_client.shard!.ids.includes(0)) return null;

            const slugify = require("slugify");
            const converter = require("discord-emoji-converter");

            const categories = [..._client.bahamut.cmdHandler.commandHandler.commands.keys()],
                help = {};
            let cmdCount = 0;

            categories.sort((a, b) => a.localeCompare(b)).forEach(cat => {
                const temp = {},
                    cmds = this.cmdHandler.commandHandler.getCommandsByCategory(cat, true);

                cmds.forEach(c => {
                    if (!c.hidden && !c.testOnly && !c.ownerOnly) {
                        temp[c.names[0]] = {
                            "description": c.description,
                            "aliases": c.names.slice(1),
                            "usage": `${c.names[0]} ${c.syntax}`,
                        };
                        cmdCount++;
                    }
                });

                if (Object.keys(temp).length > 0) {
                    help[slugify(cat.replace(/(:.*?:)/g, "").trim(), {
                        lower: true,
                        strict: true,
                        locale: "en",
                    })] = {
                        "name": `${converter.emojify(this.cmdHandler.categories.get(cat))} ${cat}`,
                        "clean_name": cat.replace(/(:.*?:)/g, "").trim(),
                        "commands": temp,
                    };
                }
            });

            if (cmdCount < 100) {
                return false;
            }

            return help;
        }));

        data = data.filter(e => e != null);
        if (Array.isArray(data) && data.length >= 1) data = data[0];

        return data;
    };
*/
    getUserServers = async (user: string) => {
        const data = (await this._manager.broadcastEval((_client: BahamutClient, obj) => {
            return getUserGuilds(_client, obj.userId);
        }, { context: { userId: user } }));

        const tempData = [];
        for (const shard of data) {
            for (const srv of shard) {
                tempData.push(srv);
            }
        }

        return tempData;
    };

    getGuildDetails = async (guild: string, user: string, withAchievements: boolean, language: string = "en") => {
        const data = (await this._manager.broadcastEval((_client: BahamutClient, obj) => {
            return getGuildDetails(_client, obj.guildId, obj.userId, obj.withAchievements, obj.language);
        }, { context: { guildId: guild, userId: user, withAchievements: withAchievements, language: language } }));

        return (Array.isArray(data) ? data.filter((e) => e !== null) : data);
    };

    setGuildOptions = async (guild: string, options: any): Promise<boolean> => {
        const data = (await this._manager.broadcastEval((_client: BahamutClient, obj) => {
            return this.setGuildOptions(obj.guildId, obj.options);
        }, { context: { guildId: guild, options: options } }));

        return (Array.isArray(data) ? data.filter((e) => e !== null)[0] : data);
    };

    getManagedGuilds = async () => {
        const data = (await this._manager.broadcastEval((_client: BahamutClient) => {
            return _client.guilds.cache.map((e) => {
                return {
                    id: e.id,
                    name: e.name,
                    icon: e.iconURL({ forceStatic: true, extension: "png" }),
                    acronym: e.nameAcronym,
                    members: e.members.cache.size,
                    channels: e.channels.cache.size,
                };
            });
        })).flat();
        return data;
    };

    getManagedShards = async () => {
        const data = (await this._manager.broadcastEval((_client: BahamutClient) => {
            return {
                "shardId": _client.shardId,
                "guilds": _client.guilds.cache.map((e) => {
                    return {
                        id: e.id,
                        name: e.name,
                        icon: e.iconURL({ forceStatic: true, extension: "png" }),
                        acronym: e.nameAcronym,
                        members: e.members.cache.size,
                        channels: e.channels.cache.size,
                    };
                }),
                "guildCount": _client.guilds.cache.size,
                "membersTotal": _client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                "channelCount": _client.channels.cache.size,
                "totalMusicQueues": _client.bahamut.musicHandler.manager.players.size,
                "playingMusicQueues": Array.from(_client.bahamut.musicHandler.manager.players.values()).reduce((a, q) => a + ((q.playing || !q.paused) ? 1 : 0), 0),
                "uptime": _client.uptime,
                "time": Date.now(),
            };
        })).flat();

        return data;
    };

    getManagedUsers = async () => {
        const data = (await this._manager.broadcastEval((_client: BahamutClient) => {
            return _client.guilds.cache.map(g => {
                return g.members.cache.map(u => {
                    return {
                        id: u.id,
                        username: u.user.username,
                        displayname: u.displayName,
                        discriminator: u.user.discriminator,
                        avatar: u.avatarURL({ forceStatic: true, extension: "png" }),
                    };
                });
            });
        })).flat();
        return data;
    };
}