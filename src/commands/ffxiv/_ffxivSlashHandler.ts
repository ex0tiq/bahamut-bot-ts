import { getAllJSFiles } from "../../lib/toolFunctions";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { handleErrorResponseToMessage } from "../../lib/messageHandlers";

const allModCommands = (() => getAllJSFiles(__dirname).filter(e => e.filePath !== __filename))();

// This is a Slash command handler for all music commands

const config: CommandConfig = {
    name: "ffxiv",
    aliases: ["xiv"],
    type: CommandType.SLASH,
    description: "Different commands related to FF XIV.",
    options: (() => {
        return allModCommands.filter(e => e.fileContents.type !== "SLASH").map(e => {
            let autocomplete = false;
            if (Array.isArray(e.fileContents.options) && e.fileContents.options.length > 0) {
                for (const o of e.fileContents.options) {
                    if (o.autocomplete) autocomplete = true;
                }
            }

            return {
                name: e.fileContents.name,
                type: 1,
                description: e.fileContents.description,
                options: e.fileContents.options || [],
                autocomplete: autocomplete,
            };
        });
    })(),
    minArgs: 0,
    category: "FFXIV",
    guildOnly: true,
    testOnly: true,
    deferReply: true,
};

export default {
    ...config,
    autocomplete: (command: string, optionName: string, interaction: Discord.CommandInteraction) => {
        try {
            // @ts-ignore
            const cmdArr = allModCommands.filter(e => e.fileContents.name === interaction.options.getSubcommand(false));

            if (!cmdArr || cmdArr.length < 1) return [];

            const cmd = cmdArr[0];

            // Call subcommand with all params
            return cmd.fileContents.autocomplete();
        } catch (ex) {
            return [];
        }
    },
    callback: async ({ message, args, client, interaction, channel, ...rest }: { message: Discord.Message, args: any[], client: BahamutClient, interaction: Discord.CommandInteraction, channel: Discord.TextChannel }) => {
        try {
            // @ts-ignore
            const cmdArr = allModCommands.filter(e => e.fileContents.name === interaction.options.getSubcommand(false));

            if (!cmdArr || cmdArr.length < 1) return [];

            const cmd = cmdArr[0];

            // Call subcommand with all params
            return await cmd.fileContents.callback({ message, args, client, interaction, channel, ...rest });
        } catch (ex) {
            console.error("Error running FFXIV slash command handler:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
        }
    },
};