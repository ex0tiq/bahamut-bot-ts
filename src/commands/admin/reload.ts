import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleSuccessResponseToMessage,
} from "../../lib/messageHandlers.js";
import logger from "../../modules/Logger.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const config: CommandConfig = {
    name: "reload",
    type: CommandType.LEGACY,
    description: "Reload a component of the bot.",
    minArgs: 1,
    expectedArgs: "<component> [name]",
    category: "Administration",
    ownerOnly: true,
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, args, member, interaction }: { client: BahamutClient, message: Discord.Message, args: any[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        if (![client.bahamut.config.owner_id].includes(member.id)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You do not have the permissions to execute this command.");

        if (args.length === 1) {
            if (["guilduserdata", "gudata", "userdata", "udat"].includes(args[0].toLowerCase())) {
                client.bahamut.levelSystem.guildUserLevelDataCache[message.guild!.id] = {};

                logger.log(client.shardId, "Guild user data cache has been cleared!");
                return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, "Guild user data cache has been cleared!");
            } else if (["guildsettings", "gusettings", "guset"].includes(args[0].toLowerCase())) {
                let res = null;
                if ((res = await client.bahamut.dbHandler.guildSettings.getDBAllGuildSettings())) {
                    client.bahamut.settings = res;

                    logger.log(client.shardId, `${Object.keys(res).length} guild configs have been reloaded!`);
                    return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${res.size} guild configs have been reloaded!`);
                } else {
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while reloading the guild configs!");
                }
            } else if (["radiostations", "rstations", "radio"].includes(args[0].toLowerCase())) {
                try {
                    client.bahamut.musicHandler.radioStations = JSON.parse(
                        readFileSync(resolve("assets/radio_stations.json"), "utf-8")
                    );

                    logger.log(client.shardId, "Radio stations have been reloaded!");
                    return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, "Radio stations have been reloaded!");
                } catch (e) {
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while reloading the radio stations!");
                }
            } else if (["musicfilters", "filters"].includes(args[0].toLowerCase())) {
                try {
                    client.bahamut.musicHandler.radioStations = JSON.parse(
                        readFileSync(resolve("assets/music_filters.json"), "utf-8")
                    );

                    logger.log(client.shardId, "Music filters have been reloaded!");
                    return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, "Music filters have been reloaded!");
                } catch (e) {
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while reloading the music filters!");
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
        }
    },
};