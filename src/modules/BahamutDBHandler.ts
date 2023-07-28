import {
    CreationOptional,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model,
    QueryTypes,
    Sequelize,
} from "sequelize";
import { Bahamut } from "../bahamut.js";
import Logger from "./Logger.js";
import GuildSettingsHandler from "./databaseHandler/guildSettingsHandler.js";
import GuildUserStatHandler from "./databaseHandler/guildUserStatHandler.js";
import UserLevelDataHandler from "./databaseHandler/userLevelDataHandler.js";
import CookieHandler from "./databaseHandler/cookieHandler.js";
import CommandLogHandler from "./databaseHandler/commandLogHandler.js";
import FFXIVHandler from "./databaseHandler/ffxivHandler.js";

export default class BahamutDBHandler {
    private readonly _bahamut: Bahamut;

    private readonly _dbCon: Sequelize;

    // Other db handlers
    private readonly _guildSettings: GuildSettingsHandler;
    private readonly _guildUserStat: GuildUserStatHandler;
    private readonly _userLevelData: UserLevelDataHandler;
    private readonly _cookie: CookieHandler;
    private readonly _commandLog: CommandLogHandler;
    private readonly _ffxiv: FFXIVHandler;

    constructor(bahamut: Bahamut) {
        this._bahamut = bahamut;

        // Set db connector
        this._dbCon = new Sequelize(bahamut.config.db.database, bahamut.config.db.user, bahamut.config.db.pass, {
            host: bahamut.config.db.host,
            dialect: "mariadb",
            logging: false,
        });

        this.defineModels();

        // Load other db handlers
        this._guildSettings = new GuildSettingsHandler(this);
        this._guildUserStat = new GuildUserStatHandler(this);
        this._userLevelData = new UserLevelDataHandler(this);
        this._cookie = new CookieHandler(this);
        this._commandLog = new CommandLogHandler(this);
        this._ffxiv = new FFXIVHandler(this);
    }

    public get bahamut() {
        return this._bahamut;
    }
    public get dbCon() {
        return this._dbCon;
    }
    public get guildSettings() {
        return this._guildSettings;
    }
    public get guildUserStat() {
        return this._guildUserStat;
    }
    public get userLevelData() {
        return this._userLevelData;
    }
    public get cookie() {
        return this._cookie;
    }
    public get commandLog() {
        return this._commandLog;
    }
    public get ffxiv() {
        return this._ffxiv;
    }


    /**
     * Init DB connection
     */
    dbInit = async () => {
        // Shut down if db connection can't be opened
        if (!(await this.dbOpen())) process.exit(1);
        else Logger.ready(this._bahamut.client.shardId, `Connected to database: ${await this.getDBVersion()}`);

        // Sync db
        await this._dbCon.sync({ force: false, alter: true });
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

    getDBVersion = async () => {
        const results = await this._dbCon.query("SELECT @@version as version;", {
            type: QueryTypes.SELECT,
        });
        // @ts-ignore
        return results[0].version;
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
                primaryKey: true,
            },
            val: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this._dbCon,
            modelName: "guild_stats",
            freezeTableName: true,
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
            freezeTableName: true,
        });
        DBGuildCharacters.init({
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            guild_user: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            lodestone_char: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
        }, {
            sequelize: this._dbCon,
            modelName: "guild_characters",
            freezeTableName: true,
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
                primaryKey: true,
            },
            user_xp: {
                type: DataTypes.MEDIUMINT.UNSIGNED,
                defaultValue: 0,
            },
            user_level: {
                type: DataTypes.TINYINT.UNSIGNED,
                defaultValue: 1,
            },
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this._dbCon,
            modelName: "guild_user_levels",
            freezeTableName: true,
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
                primaryKey: true,
            },
            stat: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            val: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this._dbCon,
            modelName: "guild_user_stats",
            freezeTableName: true,
        });
        DBGuildPlaylists.init({
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
                unique: "id",
            },
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(100),
                defaultValue: null,
                primaryKey: true,
            },
        }, {
            sequelize: this._dbCon,
            modelName: "guild_playlists",
            freezeTableName: true,
        });
        DBGuildSongs.init({
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            playlist_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            link: {
                type: DataTypes.STRING(200),
                defaultValue: null,
            },
            runtime: {
                type: DataTypes.SMALLINT.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
        }, {
            sequelize: this._dbCon,
            modelName: "guild_songs",
            freezeTableName: true,
        });
        DBGuildCommandLog.init({
            entry_id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            guild_id: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
            guild_user: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
            guild_username: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            guild_channel: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
            command: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
            args: {
                type: DataTypes.STRING(2000),
                defaultValue: null,
            },
            isSlash: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: DataTypes.DATE,
        }, {
            sequelize: this._dbCon,
            modelName: "guild_command_logs",
            freezeTableName: true,
        });

        // Define foreign keys
        DBGuildPlaylists.hasOne(DBGuildSongs, {
            foreignKey: "playlist_id",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    };
}

// Sequelize DB Types
export class DBGuildStats extends Model<InferAttributes<DBGuildStats>, InferCreationAttributes<DBGuildStats>> {
    declare guild_id: string;
    declare stat: string;
    declare val: number;
    declare updatedAt: CreationOptional<Date>;
}
export class DBGuildSettings extends Model<InferAttributes<DBGuildSettings>, InferCreationAttributes<DBGuildSettings>> {
    declare guild_id: string;
    declare setting: string;
    declare val: string;
    declare val_type: string;
}
export class DBGuildCharacters extends Model<InferAttributes<DBGuildCharacters>, InferCreationAttributes<DBGuildCharacters>> {
    declare guild_id: string;
    declare guild_user: string;
    declare lodestone_char: string;
}
export class DBGuildUserLevels extends Model<InferAttributes<DBGuildUserLevels>, InferCreationAttributes<DBGuildUserLevels>> {
    declare guild_id: string;
    declare guild_user: string;
    declare user_xp: number;
    declare user_level: number;
    declare updatedAt: CreationOptional<Date>;
}
export class DBGuildUserStats extends Model<InferAttributes<DBGuildUserStats>, InferCreationAttributes<DBGuildUserStats>> {
    declare guild_id: string;
    declare guild_user: string;
    declare stat: string;
    declare val: number;
    declare updatedAt: CreationOptional<Date>;
}
export class DBGuildPlaylists extends Model<InferAttributes<DBGuildPlaylists>, InferCreationAttributes<DBGuildPlaylists>> {
    declare id: string;
    declare guild_id: string;
    declare name: string;
}
export class DBGuildSongs extends Model<InferAttributes<DBGuildSongs>, InferCreationAttributes<DBGuildSongs>> {
    declare id: string;
    declare playlist_id: string;
    declare name: string;
    declare link: string;
    declare runtime: number;
}
export class DBGuildCommandLog extends Model<InferAttributes<DBGuildCommandLog>, InferCreationAttributes<DBGuildCommandLog>> {
    declare entry_id?: string;
    declare guild_id: string;
    declare guild_user: string;
    declare guild_username: string;
    declare guild_channel: string;
    declare command: string;
    declare args: string;
    declare isSlash: boolean;
    declare createdAt: CreationOptional<Date>;
}