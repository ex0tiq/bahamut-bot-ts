import BahamutDBHandler from "./modules/BahamutDBHandler";
import scheduler, { Job } from "node-schedule";

if (Number(process.version.slice(1).split(".")[0]) < 16) throw new Error("Node 16.0.0 or higher is required. Update Node on your system.");

import BahamutClient from "./modules/BahamutClient.js";
// const lang = require('./lib/languageMessageHandlers');
import { loadBotStuff } from "./lib/botStartupFunctions.js";
import Logger from "./modules/Logger.js";
import { BotConfig, DiscordGame, GuildSettings, StartupMessage } from "../typings.js";
import WOK from "wokcommands";
import PremiumManager from "./modules/PremiumManager";
import LavaManager from "./modules/LavaManager";
import { isJson } from "./lib/validateFunctions";
import LevelSystem from "./modules/LevelSystem";
import { Settings } from "luxon";
import FFXIV from "./modules/FFXIV";
import LanguageMessageHandler from "./lib/languageMessageHandlers";
import * as Events from "events";
import GameListeners from "./modules/EventListeners/GameListeners";
import ClientFFXIVSchedulers from "./modules/ClientFFXIVSchedulers";

// Non ES imports
const { client } = require("tenorjs");

export class Bahamut {
    private _client: BahamutClient = new BahamutClient(this);
    // Here we load the config file that contains our token and our prefix values.
    private _config: BotConfig = require("../config/config.json");
    // WOKCommands instance
    private _cmdHandler!: WOK;
    // DB Handler
    private _dbHandler: BahamutDBHandler;
    // Premium Manager
    private _premiumHandler: PremiumManager;
    // Music handler
    private _musicHandler: LavaManager;
    // Level System
    private _levelSystem: LevelSystem;
    // FFXIV Stuff
    private _ffxiv: FFXIV;

    // Save all handled guilds settings
    private _settings: Map<string, GuildSettings> = new Map<string, GuildSettings>;

    // Set node-schedule object
    private _scheduler: typeof scheduler = scheduler;
    private _schedules: Map<string, Job> = new Map<string, Job>;
    // Set event handler
    private _eventHandler = new Events.EventEmitter();

    // Set map for running games
    private _runningGames: Map<string, DiscordGame> = new Map<string, DiscordGame>;

    // Set global tenor object
    private _tenor;

    constructor() {
        const shardArgs = (process.argv.length > 2 ? process.argv.slice(2).join(" ") : null);
        if (!shardArgs || !isJson(shardArgs)) {
            throw new Error("No boot configuration received!");
        }

        // Load config
        this._config = {
            ...this._config,
            ...JSON.parse(shardArgs),
        };
        
        // Set luxon default locale
        Settings.defaultLocale = "en";
        Settings.defaultZone = "Europe/Berlin";

        // Initiate dbhandler
        this._dbHandler = new BahamutDBHandler(this);
        // Init premium handler
        this._premiumHandler = new PremiumManager(this);
        // Init music handler
        this._musicHandler = new LavaManager(this);
        // Init level system
        this._levelSystem = new LevelSystem(this);
        // Init FFXIV stuff
        this._ffxiv = new FFXIV(this);

        // Register GameListeners
        GameListeners(this);

        // Init tenor object
        this._tenor = client({
            "Key": this.config.tenor_token,
            "Filter": "low",
            "Locale": "en_US",
            "MediaFilter": "minimal",
            "DateFormat": "MM/DD/YYYY - H:mm:ss A",
        });

        // Register ready event
        this._client.on("ready", async () => {
            //
        });

        this._client.login(this._config.token).then(async () => {
            // Init db connection
            await this._dbHandler.dbInit();

            // Load all languagse
            await LanguageMessageHandler.initLanguageFiles();

            //
            // RUN THIS ONLY ONCE ON STARTUP AFTER A LARGE CHANGE
            //
            // Clear all application commands on start
            // await this._client.application!.commands.set([]);
            // Remove all guild specific commands on start
            // for (const g of this.config.test_servers) {
            //    if (this._client.guilds.cache.has(g)) await this._client.guilds.cache.get(g)!.commands.set([]);
            // }

            // Load bot events, commands, etc.
            await loadBotStuff(this);

            // Start client scheduler
            new ClientFFXIVSchedulers(this);

            Logger.log(this._client.shardId, `${this._client.user?.tag}, ready to serve ${this._client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} users in ${this._client.guilds.cache.size} servers.`, "ready");
        });


        process.on("message", async (message: StartupMessage) => {
            if (!message.type) return false;
            if (message.type == "startupData") {
                if (message.data.shardId || message.data.shardId === 0) this._client.shardId = message.data.shardId;
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
    public get premiumHandler() {
        return this._premiumHandler;
    }
    public get musicHandler() {
        return this._musicHandler;
    }
    public get levelSystem() {
        return this._levelSystem;
    }
    public get settings() {
        return this._settings;
    }
    public set settings(set) {
        this._settings = set;
    }
    public get scheduler() {
        return this._scheduler;
    }
    public get schedules() {
        return this._schedules;
    }
    public get ffxiv() {
        return this._ffxiv;
    }
    public get eventHandler() {
        return this._eventHandler;
    }
    public get runningGames() {
        return this._runningGames;
    }

    public get tenor() {
        return this._tenor;
    }
}

export default new Bahamut();