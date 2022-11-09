import {DataTypes, InferAttributes, InferCreationAttributes, Model, QueryTypes, Sequelize} from "sequelize";
import Bahamut from "../bahamut";
import Logger from "./Logger";
import Discord from "discord.js";
import {isInt, isJson} from "../lib/validateFunctions";
import {parseBool} from "../lib/parseFunctions";
import {GuildSettings} from "../../typings";

export default class BahamutDBHandler {
    private _bahamut: typeof Bahamut;

    private _dbCon: Sequelize;

    constructor(bahamut: typeof Bahamut) {
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

    getAllGuildSettings = async() => {
        const obj: Map<string, GuildSettings> = new Map<string, GuildSettings>;
        // eslint-disable-next-line no-unused-vars
        for (const [snowflake,] of this._bahamut.client.guilds.cache) {
            let res = null;
            if ((res = await this.getGuildSettings(snowflake))) {
                obj.set(snowflake, res);
            }
        }
        return obj;
    }

    getGuildSettings = async (guild: Discord.Guild | string): Promise<GuildSettings | null> => {
        try {
            const settings = await DBGuildSettings.findAll({
                where: {
                    guild_id: (typeof guild === "string" ? guild : guild.id)
                },
                raw: true
            });

            const mappedSettings = settings.map((e: DBGuildSettings) => {
                let val: any;
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
                        console.log(isInt(e.val) );
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
                ...this._bahamut.config.defaultSettings,
                ...(Object.assign({}, ...mappedSettings) as GuildSettings)
            }
        } catch (error) {
            console.error('An error occured while querying guild settings:', error);
            return null;
        }
    };












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
            last_set: {
                type: "TIMESTAMP",
                allowNull: false,
                defaultValue: this._dbCon.literal("CURRENT_TIMESTAMP")
            }
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
    declare last_set: string;
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
    declare updatedAt: string;
}
class DBGuildUserStats extends Model<InferAttributes<DBGuildUserStats>, InferCreationAttributes<DBGuildUserLevels>> {
    declare guild_id: string;
    declare guild_user: string;
    declare stat: string;
    declare val: number;
    declare updatedAt: string;
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
    declare createdAt: string;
}