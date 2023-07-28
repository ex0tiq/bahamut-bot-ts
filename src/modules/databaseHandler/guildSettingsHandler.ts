import BahamutDBHandler, { DBGuildSettings } from "../BahamutDBHandler.js";
import { GuildSettings } from "../../../typings.js";
import Discord from "discord.js";
import { isInt, isJson } from "../../lib/validateFunctions.js";
import { parseBool } from "../../lib/parseFunctions.js";
import { getGuildDetails, getGuildSettings, getUserGuilds } from "../../lib/getFunctions.js";
import { setGuildOptions } from "../../lib/setFunctions.js";

export default class GuildSettingsHandler {
    // DB Handler instance
    private _dbHandler: BahamutDBHandler;

    constructor(dbHandler: BahamutDBHandler) {
        this._dbHandler = dbHandler;
    }

    getGuildDetails = async (guild: string | Discord.Guild, user: string | Discord.User, withAchievements = false, language = "en") => {
        return getGuildDetails(this._dbHandler.bahamut.client, guild, user, withAchievements, language);
    };
    getUserGuilds = async (user: Discord.User | string) => {
        return getUserGuilds(this._dbHandler.bahamut.client, user);
    };


    getDBAllGuildSettings = async () => {
        const obj: Map<string, GuildSettings> = new Map<string, GuildSettings>;
        for (const [snowflake] of this._dbHandler.bahamut.client.guilds.cache) {
            let res = null;
            if ((res = await this.getDBGuildSettings(snowflake))) {
                obj.set(snowflake, res);
            }
        }
        return obj;
    };

    getDBGuildSettings = async (guild: Discord.Guild | string): Promise<GuildSettings> => {
        try {
            const settings = await DBGuildSettings.findAll({
                where: {
                    guild_id: (typeof guild === "string" ? guild : guild.id),
                },
                raw: true,
            });

            const mappedSettings = settings.map((e: DBGuildSettings) => {
                let val: any;

                switch (e.val_type) {
                    case "string":
                        return {
                            [e.setting]: e.val,
                        };
                    case "json":
                        if (isJson(e.val)) {
                            return {
                                [e.setting]: JSON.parse(e.val),
                            };
                        } else {
                            return {
                                [e.setting]: e.val,
                            };
                        }
                    case "bool":
                        if ((val = parseBool(e.val)) !== null) {
                            return {
                                [e.setting]: val,
                            };
                        } else {
                            return {
                                [e.setting]: e.val,
                            };
                        }
                    case "int":
                        if (isInt(e.val) && (val = parseInt(e.val, 10))) {
                            return {
                                [e.setting]: val,
                            };
                        } else {
                            return {
                                [e.setting]: e.val,
                            };
                        }
                    default:
                        return {
                            [e.setting]: e.val,
                        };
                }
            });

            return {
                ...this._dbHandler.bahamut.config.defaultSettings,
                ...(Object.assign({}, ...mappedSettings) as GuildSettings),
            };
        } catch (error) {
            console.error("An error occured while querying guild settings:", error);
            return this._dbHandler.bahamut.config.defaultSettings;
        }
    };

    setGuildOptions = async (guild: string, options: any) => {
        return setGuildOptions(this._dbHandler.bahamut.client, guild, options);
    };

    setDBGuildSettings = async (guild: Discord.Guild | string, settingsArr: {}) => {
        try {
            const clientSettings = await getGuildSettings(this._dbHandler.bahamut.client, guild);

            for (const [key, val] of Object.entries(settingsArr)) {
                if (key === "disabled_categories" && !Array.isArray(val)) {
                    if (clientSettings.disabled_categories.includes(<string>val)) continue;
                    clientSettings.disabled_categories.push(<string>val);
                    await this.setDBGuildSetting(guild, "disabled_categories", JSON.stringify(clientSettings.disabled_categories));
                } else if (key === "enabled_categories" && !Array.isArray(val)) {
                    let i = -1;
                    if ((i = clientSettings.disabled_categories.indexOf(<string>val)) !== -1) {
                        clientSettings.disabled_categories.splice(i, 1);
                        await this.setDBGuildSetting(guild, "disabled_categories", JSON.stringify(clientSettings.disabled_categories));
                    }
                } else if (key === "disabled_commands" && Array.isArray(val)) {
                    for (const cmd of val) {
                        if (!this._dbHandler.bahamut.cmdHandler.commandHandler.commands.has(cmd)) continue;
                        clientSettings.disabled_commands.push(cmd);
                    }
                    await this.setDBGuildSetting(guild, "disabled_commands", JSON.stringify(clientSettings.disabled_commands));
                } else if (key === "enabled_commands" && Array.isArray(val)) {
                    for (const cmd of val) {
                        if (!this._dbHandler.bahamut.cmdHandler.commandHandler.commands.has(cmd)) continue;
                        let i = -1;
                        if ((i = clientSettings.disabled_commands.indexOf(cmd)) !== -1) {
                            clientSettings.disabled_commands.splice(i, 1);
                        }
                    }
                    await this.setDBGuildSetting(guild, "disabled_commands", JSON.stringify(clientSettings.disabled_commands));
                } else if (typeof val !== "string") {
                    await this.setDBGuildSetting(guild, key, JSON.stringify(val));
                } else {
                    await this.setDBGuildSetting(guild, key, val);
                }
            }
            this._dbHandler.bahamut.settings.set((typeof guild === "string" ? guild : guild.id), await this.getDBGuildSettings(guild));

            return true;
        } catch (ex) {
            console.log(ex);
            return false;
        }
    };

    setDBGuildSetting = async (guild: Discord.Guild | string, setting: string, value: any, value_type?: string): Promise<boolean> => {
        const types = this._dbHandler.bahamut.config.config_types, type = types[setting] || "string";

        return new Promise((resolve) => {
            return DBGuildSettings
                .findOne({
                    where: {
                        guild_id: (typeof guild === "string" ? guild : guild.id),
                        setting: setting,
                    },
                })
                .then(async (obj: DBGuildSettings | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            val: value,
                            val_type: value_type || type,
                        });
                    } else {
                        // insert
                        await DBGuildSettings.create({
                            guild_id: (typeof guild === "string" ? guild : guild.id),
                            setting: setting,
                            val: value,
                            val_type: value_type || type,
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error("Error while saving guild setting:", e);
                    resolve(false);
                });
        });
    };

    /**
     * Delete a guild setting and restore default
     * @param {Discord.Guild|string} guild
     * @param {string} setting
     * @returns {Promise<boolean>}
     */
    deleteDBGuildSetting = async (guild: Discord.Guild | string, setting: string): Promise<boolean> => {
        try {
            await DBGuildSettings.destroy({
                where: {
                    guild_id: ((typeof guild === "string") ? guild : guild.id),
                    setting: setting,
                },
                force: true,
            });

            return true;
        } catch (ex) {
            console.error("Error while deleting guild setting:", ex);
            return false;
        }
    };
}