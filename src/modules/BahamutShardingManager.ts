import Discord from "discord.js";
import { BotAPIConfig, BotConfig } from "../../typings.js";
import UplinkAPIHandler from "./UplinkAPIHandler.js";
import BotAPIHandler from "./BotAPIHandler.js";
import ShardManagerFunctions from "./ShardManagerFunctions.js";
import ShardManDBHandler from "./ShardManDBHandler.js";
import { readFileSync } from 'fs';
import { resolve } from "path";

export default class BahamutShardingManager extends Discord.ShardingManager {
    private _uplinkApiHandler: UplinkAPIHandler;
    private _apiConfig: BotAPIConfig;
    private _config: BotConfig;

    private _startTime: number = Date.now();
    private _shardRady: boolean = false;

    private _apiHandler!: BotAPIHandler;
    private _dbHandler!: ShardManDBHandler;
    private _fn: ShardManagerFunctions;

    constructor(file: string, options: Discord.ShardingManagerOptions, uplinkApiHandler: UplinkAPIHandler) {
        super(file, options);

        this._uplinkApiHandler = uplinkApiHandler;

        this._apiConfig = JSON.parse(
            readFileSync(resolve("config/api_config.json"), "utf-8")
        );

        this._config = JSON.parse(
            readFileSync(resolve("config/config.json"), "utf-8")
        );

        this._fn = new ShardManagerFunctions(this);
    }

    public get apiConfig() {
        return this._apiConfig;
    }
    public set apiConfig(newConfig: BotAPIConfig) {
        this._apiConfig = newConfig;
    }
    public get dbHandler() {
        return this._dbHandler;
    }
    public set dbHandler(handler) {
        this._dbHandler = handler;
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

    private async loadConfigs() {
        
    }
}