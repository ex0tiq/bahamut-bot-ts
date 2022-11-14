import WOK, { DefaultCommands } from "wokcommands";
import path from "path";
import { numberWithCommas } from "./toolFunctions.js";
import BahamutClient from "../modules/BahamutClient.js";
import { ActivityType } from "discord-api-types/v10";
import logger from "../modules/Logger.js";
import { Bahamut } from "../bahamut.js";

const loadBotStuff = async (bahamut: Bahamut) => {
    await registerCommands(bahamut);
    await loadGuildSettings(bahamut);
    await setGuildPrefixes(bahamut);
    await startBotActivityUpdates(bahamut);
};

const loadGuildSettings = async (bahamut: Bahamut) => {
    // Load guild settings
    const settings = await bahamut.dbHandler.guildSettings.getDBAllGuildSettings();
    if (!settings) return;

    for (const [snowflake, gs] of settings) {
        bahamut.settings.set(snowflake, {
            ...bahamut.config.defaultSettings,
            ...gs,
        });
    }

    logger.ready(bahamut.client.shardId, `${bahamut.settings.size} guild configs loaded successfully!`);
};

const setGuildPrefixes = (bahamut: Bahamut) => {
    // Set guild prefixes
    for (const [g, s] of bahamut.settings.entries()) {
        if (s.prefix !== bahamut.config.defaultSettings.prefix) bahamut.cmdHandler.commandHandler.prefixHandler.set(bahamut.client.guilds.cache.get(g)?.id, s.prefix);
    }
};

/**
 * Start bot activity
 * @param bahamut
 */
const startBotActivityUpdates = async (bahamut: Bahamut) => {
    // Schedule a EorzeaTime Update every 12 seconds (5 times is max amount per minute, accepted by discord)
    bahamut.schedules.set("botActivityScheduler",
        bahamut.scheduler.scheduleJob("*/12 * * * * *", async () => {
            const act = await getBotActivity(bahamut.client);
            bahamut.client.user?.setActivity(`reigning over ${act.totalGuilds} servers with ${act.totalUsers} users`, { type: ActivityType.Playing });
        })
    );

    const act = await getBotActivity(bahamut.client);
    bahamut.client.user?.setActivity(`reigning over ${act.totalGuilds} servers with ${act.totalUsers} users`, { type: ActivityType.Playing });
};

const registerCommands = (bahamut: Bahamut) => {
    // @ts-ignore
    bahamut.cmdHandler = new WOK({
        // @ts-ignore
        client: bahamut.client,
        // The name of the local folder for your command files
        commandsDir: path.resolve(__dirname, "../commands"),

        // Configure your event handlers
        events: {
            // Where your events are located. This is required if you
            // provide this events object
            dir: path.resolve(__dirname, "../events"),
        },

        // What language your bot should use
        // Must be supported in your messages.json file
        // defaultLanguage: 'english',

        // What server/guild IDs are used for testing only commands & features
        testServers: ["809728531789119510", "814434890745118720"],

        // User your own ID
        // If you only have 1 ID then you can pass in a string instead
        botOwners: [bahamut.config.owner_id!],

        // Configure the cooldowns for your commands and features
        cooldownConfig: {
            errorMessage: "Please wait {TIME} before doing that again.",
            botOwnersBypass: false,
            // The amount of seconds required for a cooldown to be
            // persistent via MongoDB.
            dbRequired: 300,
        },

        // What built-in commands should be disabled.
        // Note that you can overwrite a command as well by using
        // the same name as the command file name.
        disabledDefaultCommands: [
            DefaultCommands.ChannelCommand,
            DefaultCommands.CustomCommand,
            DefaultCommands.RequiredPermissions,
            DefaultCommands.RequiredRoles,
            DefaultCommands.ToggleCommand,
        ],
    });
};

const getBotActivity = async (client: BahamutClient) => {
    // @ts-ignore
    const data = (await client.shard?.broadcastEval((_client: BahamutClient) => {
        return {
            guildCount: _client.guilds.cache.size,
            membersTotal: _client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        };
    }));

    return {
        "shardCount": data?.length || 0,
        "totalGuilds": numberWithCommas(data?.reduce((a, g) => a + g.guildCount, 0) || 0),
        "totalUsers": numberWithCommas(data?.reduce((a, g) => a + g.membersTotal, 0) || 0),
    };
};

export { loadBotStuff };