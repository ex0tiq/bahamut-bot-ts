import {
    CreationOptional,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model,
    QueryTypes,
    Sequelize
} from "sequelize";
import {Bahamut} from "../bahamut";
import Logger from "./Logger";
import Discord from "discord.js";
import {isInt, isJson} from "../lib/validateFunctions";
import {parseBool} from "../lib/parseFunctions";
import {GuildSettings} from "../../typings";

export default class BahamutDBHandler {
    private _bahamut: Bahamut;

    private _dbCon: Sequelize;

    constructor(bahamut: Bahamut) {
        this._bahamut = bahamut;

        // Set db connector
        this._dbCon = new Sequelize(bahamut.config.db.database, bahamut.config.db.user, bahamut.config.db.pass, {
            host: bahamut.config.db.host,
            dialect: "mariadb",
            logging: false
        });

        this.defineModels();
    }

    /**
     * Init DB connection
     */
    dbInit = async() => {
        // Shut down if db connection can't be opened
        if (!(await this.dbOpen())) process.exit(1);
        else Logger.ready(this._bahamut.client.shardId, `Connected to database: ${await this.getDBVersion()}`);

        // Sync db
        await this._dbCon.sync({ force: false });
    }

    /**
     * Open DB connection
     */
    dbOpen = async() => {
        try {
            await this._dbCon.authenticate();
            return true;
        } catch (error) {
            console.error('Unable to connect to the database:', error);
            return false;
        }
    }

    getDBVersion = async() => {
        const results = await this._dbCon.query("SELECT @@version as version;", {
            type: QueryTypes.SELECT
        });
        // @ts-ignore
        return results[0].version;
    }

    getDBAllGuildSettings = async() => {
        const obj: Map<string, GuildSettings> = new Map<string, GuildSettings>;
        // eslint-disable-next-line no-unused-vars
        for (const [snowflake,] of this._bahamut.client.guilds.cache) {
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
            }), types = this._bahamut.config.config_types;

            const mappedSettings = settings.map((e: DBGuildSettings) => {
                let val: any, type: string;
                console.log(e.val_type);
                if ((type = types[e.setting])) {
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
                } else {
                    return {
                        [e.setting]: e.val
                    };
                }
            });

            return {
                ...this._bahamut.config.defaultSettings,
                ...(Object.assign({}, ...mappedSettings) as GuildSettings)
            }
        } catch (error) {
            console.error('An error occured while querying guild settings:', error);
            return this._bahamut.config.defaultSettings;
        }
    };

    setDBGuildSetting = async (guild: Discord.Guild | string, setting: string, value: any, value_type?: string): Promise<boolean> => {
        const types = this._bahamut.config.config_types, type = types[setting] || "string";

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
    deleteDBGuildSetting = async (guild: Discord.Guild | string, setting: string) => {
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

    /**
     * Increase a bot stat by x
     * @param guild
     * @param user
     * @param stat
     * @param value
     * @returns {Promise<boolean>}
     */
        // eslint-disable-next-line no-unused-vars
    addDBGuildUserStat = async (guild: Discord.Guild, user: Discord.GuildMember, stat: string, value = 1) => {
        return new Promise((resolve) => {
            return DBGuildUserStats
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id,
                        stat: stat
                    }})
                .then(async (obj: DBGuildUserStats | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            val: obj.val + value
                        });
                    } else {
                        // insert
                        await DBGuildUserStats.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            stat: stat,
                            val: value,
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error('Error while saving guild setting:', e);
                    resolve(false);
                });
        });
    }









    defineModels = () => {
        DBGuildStats.init({
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            stat: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true
            },
            val: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this._dbCon,
            modelName: "guild_stats"
        });
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
                type: DataTypes.TEXT('long'),
                defaultValue: null,
            },
            val_type: {
                type: DataTypes.STRING(50),
                allowNull: false,
            }
        }, {
            sequelize: this._dbCon,
            modelName: "guild_settings"
        })
        DBGuildCharacters.init({
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            guild_user: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true
            },
            lodestone_char: {
                type: DataTypes.STRING(30),
                allowNull: false
            }
        }, {
            sequelize: this._dbCon,
            modelName: "guild_characters"
        });
        DBGuildUserLevels.init({
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            guild_user: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true
            },
            user_xp: {
                type: DataTypes.MEDIUMINT.UNSIGNED,
                defaultValue: 0
            },
            user_level: {
                type: DataTypes.TINYINT.UNSIGNED,
                defaultValue: 1
            },
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this._dbCon,
            modelName: "guild_user_levels"
        });
        DBGuildUserStats.init({
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            guild_user: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true
            },
            stat: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true
            },
            val: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this._dbCon,
            modelName: "guild_user_stats"
        });
        DBGuildPlaylists.init({
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
                unique: true
            },
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(100),
                defaultValue: null,
                primaryKey: true
            },
        }, {
            sequelize: this._dbCon,
            modelName: "guild_playlists"
        });
        DBGuildSongs.init({
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            playlist_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            link: {
                type: DataTypes.STRING(200),
                defaultValue: null
            },
            runtime: {
                type: DataTypes.SMALLINT.UNSIGNED,
                allowNull: false,
                defaultValue: 0
            },
        }, {
            sequelize: this._dbCon,
            modelName: "guild_songs"
        });
        DBGuildCommandLog.init({
            entry_id: {
                type: DataTypes.STRING(50),
                allowNull: false,
                primaryKey: true
            },
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false
            },
            guild_user: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
            guild_username: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
            guild_channel: {
                type: DataTypes.STRING(30),
                allowNull: false
            },
            command: {
                type: DataTypes.STRING(30),
                allowNull: false
            },
            args: {
                type: DataTypes.STRING(2000),
                defaultValue: null,
            },
            createdAt: DataTypes.DATE,
        }, {
            sequelize: this._dbCon,
            modelName: "guild_command_logs"
        });

        // Define foreign keys
        DBGuildPlaylists.hasOne(DBGuildSongs, {
            foreignKey: "playlist_id",
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
        })
    }
}

// Sequelize DB Types
class DBGuildStats extends Model<InferAttributes<DBGuildStats>, InferCreationAttributes<DBGuildStats>> {
    declare guild_id: string;
    declare stat: string;
    declare val: number;
    declare updatedAt: CreationOptional<Date>;
}
class DBGuildSettings extends Model<InferAttributes<DBGuildSettings>, InferCreationAttributes<DBGuildSettings>> {
    declare guild_id: string;
    declare setting: string;
    declare val: string;
    declare val_type: string;
}
class DBGuildCharacters extends Model<InferAttributes<DBGuildCharacters>, InferCreationAttributes<DBGuildCharacters>> {
    declare guild_id: string;
    declare guild_user: string;
    declare lodestone_char: string;
}
class DBGuildUserLevels extends Model<InferAttributes<DBGuildUserLevels>, InferCreationAttributes<DBGuildUserLevels>> {
    declare guild_id: string;
    declare guild_user: string;
    declare user_xp: number;
    declare user_level: number;
    declare updatedAt: CreationOptional<Date>;
}
class DBGuildUserStats extends Model<InferAttributes<DBGuildUserStats>, InferCreationAttributes<DBGuildUserStats>> {
    declare guild_id: string;
    declare guild_user: string;
    declare stat: string;
    declare val: number;
    declare updatedAt: CreationOptional<Date>;
}
class DBGuildPlaylists extends Model<InferAttributes<DBGuildPlaylists>, InferCreationAttributes<DBGuildPlaylists>> {
    declare id: string;
    declare guild_id: string;
    declare name: string;
}
class DBGuildSongs extends Model<InferAttributes<DBGuildSongs>, InferCreationAttributes<DBGuildSongs>> {
    declare id: string;
    declare playlist_id: string;
    declare name: string;
    declare link: string;
    declare runtime: number;
}
class DBGuildCommandLog extends Model<InferAttributes<DBGuildCommandLog>, InferCreationAttributes<DBGuildCommandLog>> {
    declare entry_id: string;
    declare guild_id: string;
    declare guild_user: string;
    declare guild_username: string;
    declare guild_channel: string;
    declare command: string;
    declare args: string;
    declare createdAt: CreationOptional<Date>;
}