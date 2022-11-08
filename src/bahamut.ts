import BahamutDBHandler from "./modules/Database";

process.env.TZ = 'UTC';

if (Number(process.version.slice(1).split('.')[0]) < 16) throw new Error('Node 16.0.0 or higher is required. Update Node on your system.');

import BahamutClient from "./modules/BahamutClient.js";
//const lang = require('./lib/languageMessageHandlers');
import { loadBotStuff }  from "./lib/botStartupFunctions.js";
import Logger from "./modules/Logger.js";
import {BotConfig, StartupMessage} from "../typings.js";
import WOK from "wokcommands";

// Use bluebird as global promise library
//global.Promise = require('bluebird');

class Bahamut {
    private _client: BahamutClient = new BahamutClient(this);
    // Here we load the config file that contains our token and our prefix values.
    private _config: BotConfig = require("./config/config.json");
    // WOKCommands instance
    private _cmdHandler!: WOK;
    // DB Handler
    private _dbHandler: BahamutDBHandler;

    constructor() {
        // Initiate dbhandler
        this._dbHandler = new BahamutDBHandler(this);

        // Register functions
        this._client.on("ready", () => {
            //require('./modules/functions.js')(this._client);
        });

        process.on('message', async (message: StartupMessage) => {
            if (!message.type) return false;
            if (message.type == 'startupData') {
                if (message.data.shardId || message.data.shardId === 0) this._client.shardId = message.data.shardId;
                if (message.data.conf) {
                    Logger.log(this._client.shardId, 'Received boot configuration from ShardManager, loading...');

                    this._config = {
                        ...this._config,
                        ...message.data.conf,
                    };

                    // Load client libraries
                    //client.registerLibraries();
                    // Load languages
                    //await lang.initLanguageFiles();

                    // Init db
                    await this._dbHandler.dbInit();

                    // Login
                    await this._client.login(this._config.token);

                    // Load bot events, commands, etc.
                    await loadBotStuff(this);

                    Logger.log(this._client.shardId, `${this._client.user?.tag}, ready to serve ${this._client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} users in ${this._client.guilds.cache.size} servers.`, 'ready');
                }
            }
        });
    }

    public get config() {
        return this._config;
    }
    public set config(newConfig) {
        this._config = newConfig;
    }
    public get client() {
        return this._client;
    }
    public get cmdHandler() {
        return this._cmdHandler;
    }
    public set cmdHandler(newHandler: WOK) {
        this._cmdHandler = newHandler;
    }
    public get dbHandler() {
        return this._dbHandler;
    }
}

export default new Bahamut();