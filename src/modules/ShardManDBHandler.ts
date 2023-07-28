import {
    DataTypes,
    QueryTypes,
    Sequelize, WhereOptions,
} from "sequelize";
import logger from "./Logger.js";
import { BahamutShardingBootManager, GuildSettings } from "../../typings.js";
import { DBGuildSettings, DBGuildUserStats } from "./BahamutDBHandler.js";
import Discord from "discord.js";
import { isInt, isJson } from "../lib/validateFunctions.js";
import { parseBool } from "../lib/parseFunctions.js";

export default class ShardManDBHandler {
    private readonly _manager: BahamutShardingBootManager;

    private readonly _dbCon: Sequelize;

    constructor(shardMan: BahamutShardingBootManager) {
        this._manager = shardMan;

        // Set db connector
        this._dbCon = new Sequelize(this._manager.config.db.database, this._manager.config.db.user, this._manager.config.db.pass, {
            host: this._manager.config.db.host,
            dialect: "mariadb",
            logging: false,
        });

        this.defineModels();
        this.dbInit();
    }

    dbInit = async () => {
        // Shut down if db connection can't be opened
        if (!(await this.dbOpen())) process.exit(1);
        else logger.ready("SM", `Connected to database: ${await this.getDBVersion()}`);

        // Sync db
        await this._dbCon.sync({ force: false });
    };

    getDBVersion = async () => {
        const results = await this._dbCon.query("SELECT @@version as version;", {
            type: QueryTypes.SELECT,
        });
        // @ts-ignore
        return results[0].version;
    };

    /**
     * Open DB connection
     */
    dbOpen = async () => {
        try {
            await this._dbCon.authenticate();
            return true;
        } catch (error) {
            console.error("Unable to connect to the database:", error);
            return false;
        }
    };

    defineModels = () => {
        DBGuildSettings.init({
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            setting: {
                type: DataTypes.STRING(50),
                allowNull: false,
                primaryKey: true,
            },
            val: {
                type: DataTypes.TEXT("long"),
                defaultValue: null,
            },
            val_type: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
        }, {
            sequelize: this._dbCon,
            modelName: "guild_settings",
        });
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
                ...this._manager.config.defaultSettings,
                ...(Object.assign({}, ...mappedSettings) as GuildSettings),
            };
        } catch (error) {
            console.error("An error occured while querying guild settings:", error);
            return this._manager.config.defaultSettings;
        }
    };

    setDBGuildSetting = async (guild: Discord.Guild | string, setting: string, value: any, value_type?: string): Promise<boolean> => {
        const types = this._manager.config.config_types, type = types[setting] || "string";

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

    getDBGuildUserStatsSUM = async (stats: string[], guild?: string | Discord.GuildMember): Promise<Map<string, number>> => {
        const resMap = new Map<string, number>;

        for (const val of stats) {
            const res: number | null = await new Promise((resolve) => {
                const where: WhereOptions = {
                    stat: val,
                };

                if (guild) {
                    where["guild_id"] = (typeof guild === "string" ? guild : guild.id);
                }

                return DBGuildUserStats
                    .sum("val", {
                        where: where,
                    })
                    .then(async (obj: number | null) => {
                        if (obj) resolve(obj);
                        else resolve(null);
                    }).catch(e => {
                        console.error("Error while querying guild user stat:", e);
                        resolve(null);
                    });
            });

            if (res) resMap.set(val, res);
        }

        return resMap;
    };
}