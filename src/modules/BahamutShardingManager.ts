import Discord from "discord.js";
import { BotAPIConfig, BotConfig } from "../../typings.js";
import UplinkAPIHandler from "./UplinkAPIHandler.js";
import BotAPIHandler from "./BotAPIHandler";
import ShardManagerFunctions from "./ShardManagerFunctions";

export default class BahamutShardingManager extends Discord.ShardingManager {
    private _uplinkApiHandler: UplinkAPIHandler;
    private _apiConfig: BotAPIConfig = require("../../config/api_config.json");
    private _config: BotConfig = require("../../config/config.json");

    private _startTime: number = Date.now();
    private _shardRady: boolean = false;

    private _apiHandler!: BotAPIHandler;
    private _fn: ShardManagerFunctions;

    constructor(file: string, options: Discord.ShardingManagerOptions, uplinkApiHandler: UplinkAPIHandler) {
        super(file, options);

        this._uplinkApiHandler = uplinkApiHandler;
        this._fn = new ShardManagerFunctions(this);
    }

    public get apiConfig() {
        return this._apiConfig;
    }
    public set apiConfig(newConfig: BotAPIConfig) {
        this._apiConfig = newConfig;
    }
    public get config() {
        return this._config;
    }
    public set config(conf) {
        this._config = conf;
    }
    public get uplinkApiHandler() {
        return this._uplinkApiHandler;
    }
    public set uplinkApiHandler(newHandler: UplinkAPIHandler) {
        this._uplinkApiHandler = newHandler;
    }
    public get startTime() {
        return this._startTime;
    }
    public set startTime(time) {
        this._startTime = time;
    }
    public get shardReady() {
        return this._shardRady;
    }
    public set shardReady(ready) {
        this._shardRady = ready;
    }
    public get apiHandler() {
        return this._apiHandler;
    }
    public set apiHandler(handler) {
        this._apiHandler = handler;
    }
    public get fn() {
        return this._fn;
    }
}