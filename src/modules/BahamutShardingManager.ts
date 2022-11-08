import Discord from "discord.js";
import {BotAPIConfig} from "../../typings.js";
import UplinkAPIHandler from "./UplinkAPIHandler.js";

export default class BahamutShardingManager extends Discord.ShardingManager {
    private _uplinkApiHandler: UplinkAPIHandler;
    private _apiConfig: BotAPIConfig = require("../config/api_config.json");

    constructor(file: string, options: Discord.ShardingManagerOptions, uplinkApiHandler: UplinkAPIHandler) {
        super(file, options);

        this._uplinkApiHandler = uplinkApiHandler;

        //require('./ShardManagerFunctions')(this);
    }


    public get apiConfig() {
        return this._apiConfig;
    }
    public set apiConfig(newConfig: BotAPIConfig) {
        this._apiConfig = newConfig;
    }
    public get uplinkApiHandler() {
        return this._uplinkApiHandler;
    }
    public set uplinkApiHandler(newHandler: UplinkAPIHandler) {
        this._uplinkApiHandler = newHandler;
    }
};