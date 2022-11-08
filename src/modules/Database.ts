import {QueryTypes, Sequelize} from "sequelize";
import Bahamut from "../bahamut";
import DatabaseModels from "./DatabaseModels";
import Logger from "./Logger";

export default class BahamutDBHandler {
    private _bahamut: typeof Bahamut;

    private _dbCon: Sequelize;

    private _dbModels: DatabaseModels;

    constructor(bahamut: typeof Bahamut) {
        this._bahamut = bahamut;

        // Set db connector
        this._dbCon = new Sequelize(bahamut.config.db.database, bahamut.config.db.user, bahamut.config.db.pass, {
            host: bahamut.config.db.host,
            dialect: "mariadb",
            logging: false
        });

        // Define db models
        this._dbModels = new DatabaseModels(this._dbCon);
    }

    /**
     * Init DB connection
     */
    dbInit = async() => {
        // Shut down if db connection can't be opened
        if (!(await this.dbOpen())) process.exit(1);
        else Logger.ready(this._bahamut.client.shardId, `Connected to database: ${await this.getDBVersion()}`);

        // Sync db
        //await this._dbCon.sync({ force: true });
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
}