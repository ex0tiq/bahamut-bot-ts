import BahamutDBHandler, {DBGuildSettings} from "../BahamutDBHandler";
import {GuildSettings} from "../../../typings";
import Discord from "discord.js";
import {isInt, isJson} from "../../lib/validateFunctions";
import {parseBool} from "../../lib/parseFunctions";


export default class GuildSettingsHandler {
    // DB Handler instance
    private _dbHandler: BahamutDBHandler;

    constructor(dbHandler: BahamutDBHandler) {
        this._dbHandler = dbHandler;
    }


    getDBAllGuildSettings = async() => {
        const obj: Map<string, GuildSettings> = new Map<string, GuildSettings>;
        for (const [snowflake,] of this._dbHandler.bahamut.client.guilds.cache) {
            let res = null;
            if ((res = await this.getDBGuildSettings(snowflake))) {
                obj.set(snowflake, res);
            }
        }
        return obj;
    }

    getDBGuildSettings = async (guild: Discord.Guild | string): Promise<GuildSettings> => {
        try {
            const settings = await DBGuildSettings.findAll({
                where: {
                    guild_id: (typeof guild === "string" ? guild : guild.id)
                },
                raw: true
            }), types = this._dbHandler.bahamut.config.config_types;

            const mappedSettings = settings.map((e: DBGuildSettings) => {
                let val: any, type: string;
                console.log(e.val_type);
                switch (e.val_type) {
                    case 'string':
                        return {
                            [e.setting]: e.val
                        };
                    case 'json':
                        if (isJson(e.val)) return {
                            [e.setting]: JSON.parse(e.val)
                        };
                        else return {
                            [e.setting]: e.val
                        };
                    case 'bool':
                        if ((val = parseBool(e.val)) !== null) return {
                            [e.setting]: val
                        };
                        else return {
                            [e.setting]: e.val
                        };
                    case 'int':
                        console.log(isInt(e.val));
                        if (isInt(e.val) && (val = parseInt(e.val, 10))) return {
                            [e.setting]: val
                        };
                        else return {
                            [e.setting]: e.val
                        };
                    default:
                        return {
                            [e.setting]: e.val
                        };
                }
            });

            return {
                ...this._dbHandler.bahamut.config.defaultSettings,
                ...(Object.assign({}, ...mappedSettings) as GuildSettings)
            }
        } catch (error) {
            console.error('An error occured while querying guild settings:', error);
            return this._dbHandler.bahamut.config.defaultSettings;
        }
    };

    setDBGuildSetting = async (guild: Discord.Guild | string, setting: string, value: any, value_type?: string): Promise<boolean> => {
        const types = this._dbHandler.bahamut.config.config_types, type = types[setting] || "string";

        return new Promise((resolve) => {
            return DBGuildSettings
                .findOne({
                    where: {
                        guild_id: (typeof guild === "string" ? guild : guild.id),
                        setting: setting
                    }})
                .then(async (obj: DBGuildSettings | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            val: value,
                            val_type: value_type || type
                        });
                    } else {
                        // insert
                        await DBGuildSettings.create({
                            guild_id: (typeof guild === "string" ? guild : guild.id),
                            setting: setting,
                            val: value,
                            val_type: value_type || type
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild setting:', e);
                    resolve(false);
                });
        });
    }

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
                    guild_id: ((typeof guild === 'string') ? guild : guild.id),
                    setting: setting
                },
                force: true
            });

            return true;
        } catch (ex) {
            console.error('Error while deleting guild setting:', ex);
            return false;
        }
    };
}