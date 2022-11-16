import { BahamutShardingBootManager, BootConfig, BootManager, BotAPIConfig, BotStaticConfig } from "../typings.js";

process.env.TZ = "UTC";

// Include discord.js ShardingManger
import Discord from "discord.js";
import { v4 as uuidv4 } from "uuid";

// const ShardingManager = require('./modules/ShardingManager');
const config = require("../config/config.json");
const apiConfig = require("../config/api_config.json");
import logger from "./modules/Logger.js";

// const BotApiHandler = require('./modules/BotAPIHandler');
import UplinkAPIHandler from "./modules/UplinkAPIHandler.js";
// const FFXIVSchedulers = require('./modules/ShardManFFXIVSchedulers');
// const DB = require('./modules/ShardManDatabase');
// const { isInt } = require('./lib/validateFunctions');
import { isInt } from "./lib/validateFunctions.js";
import BahamutShardingManager from "./modules/BahamutShardingManager.js";
import BotAPIHandler from "./modules/BotAPIHandler";

// Use bluebird as global promise library
// import * as Promise from "bluebird";

console.log(`Running Bahamut v${process.env.npm_package_version} on NodeJS ${process.version} and discord.js v${Discord.version}.`);

// Start async startup
startup().then(() => { /* Nothing */ });

async function startup() {
    const bootManager: BootManager = {
            shardReady: false,
            startTime: Date.now(),
            config: config,
            apiConfig: apiConfig,
        },
        communication_token = uuidv4();
    let bootConf: BootConfig | null;

    // Start UplinkAPIHeartbeat
    const uplinkApiHandler = new UplinkAPIHandler(bootManager, communication_token);
    logger.log("SM", "Requesting boot configuration from C&C server...");
    // Init uplink api heartbeat and fetch boot conf
    try {
        bootConf = <BootConfig> await uplinkApiHandler.initHeartbeat(false, true);
    } catch {
        logger.error("SM", "Failed to fetch boot configuration, shutting down...");
        process.exit(0);
    }

    if (!bootConf) {
        logger.error("SM", "Failed to fetch boot configuration, shutting down...");
        process.exit(0);
    }
    if (!bootConf.token) {
        logger.error("SM", "Incomplete boot configuration received, shutting down...");
        process.exit(0);
    }

    logger.log("SM", "Boot configuration received, continuing startup...");

    bootManager.config = {
        ...bootManager.config,
        ...bootConf,
    };

    logger.log("SM", "Booting with token: " + bootConf.token);

    // Create ShardingManger instance
    const manager = new BahamutShardingManager("./dist/bahamut.js", {
        // 'auto' handles shard count automatically
        totalShards: ((bootConf.total_shards !== "auto") ? parseInt(bootConf.total_shards) : "auto"),

        // your bot token
        token: bootConf.token,

        // Stringify bootconf
        shardArgs: [JSON.stringify(bootConf)],
    }, uplinkApiHandler);

    // Combine ShardingManager with bootManager
    const botManager: BahamutShardingBootManager = Object.assign(manager, bootManager);
    // Start db connection
    // manager.dbHandler = new DB(manager),
    // Set new api manager
    // manager.uplinkApiHandler = uplinkApiHandler;
    botManager.uplinkApiHandler.setManager(botManager);

    if (!(await botManager.uplinkApiHandler.isApiReachable())) {
        logger.error("SM", "Uplink API not reachable, shutting down");
        process.exit(0);
        return;
    }

    // Start ApiHandler server
    botManager.apiHandler = new BotAPIHandler(botManager, communication_token);

    // The shardCreate event is emitted when a shard is created.
    // You can use it for something like logging shard launches.
    botManager.on("shardCreate", async (shard) => {
        shard.on("spawn", async () => {
            // Sending the data to the shard. Required for successful shard spawn
            await shard.send({ type: "startupData", data: { shardId: shard.id } });
        });
        shard.on("ready", () => {
            if (!botManager.shardReady) manager.emit("shardReady");
        });

        logger.log("SM", `Shard ${shard.id} launched`);
    });

    // @ts-ignore
    botManager.on("shardReady", async () => {
        botManager.shardReady = true;
        // Start heartbeat
        await botManager.uplinkApiHandler.initHeartbeat(false, false);
    });

    // Spawn shards
    await botManager.spawn();

    // Register schedulers
    // new FFXIVSchedulers(botManager);
}

