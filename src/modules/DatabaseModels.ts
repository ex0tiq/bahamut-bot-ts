import { Sequelize, DataTypes, Model } from 'sequelize';

export default class DatabaseModels {
    private _dbCon: Sequelize;

    constructor(dbCon: Sequelize) {
        this._dbCon = dbCon;

        this.defineModels();
    }

    defineModels = () => {
        const GuildStats = this._dbCon.define('guild_stats', {
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
        });
        const GuildSettings = this._dbCon.define("guild_settings", {
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
                allowNull: true,
                defaultValue: null,
            }
        });
        const GuildCharacters = this._dbCon.define("guild_characters", {
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
        });
        const GuildUserLevels = this._dbCon.define("guild_user_levels", {
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
            last_set: {
                type: "TIMESTAMP",
                defaultValue: this._dbCon.literal("CURRENT_TIMESTAMP"),
                allowNull: false
            }
        });
        const GuildUserStats = this._dbCon.define("guild_user_stats", {
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
            last_set: {
                type: "TIMESTAMP",
                defaultValue: this._dbCon.literal("CURRENT_TIMESTAMP"),
                allowNull: false
            }
        });
        const GuildPlaylists = this._dbCon.define("guild_playlists", {
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
                allowNull: true,
                defaultValue: null,
                primaryKey: true
            },
        });
        const GuildSongs = this._dbCon.define("guild_songs", {
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
                allowNull: true,
                defaultValue: null
            },
            runtime: {
                type: DataTypes.SMALLINT.UNSIGNED,
                allowNull: false,
                defaultValue: 0
            },
        });
        const GuildCommandLog = this._dbCon.define("guild_command_log", {
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
               allowNull: true,
               defaultValue: null,
            },
            runtime: {
               type: "TIMESTAMP",
               defaultValue: this._dbCon.literal("CURRENT_TIMESTAMP"),
               allowNull: false
            },
        });

        // Define foreign keys
        GuildPlaylists.hasOne(GuildSongs, {
            foreignKey: "playlist_id",
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
        })
    }
}