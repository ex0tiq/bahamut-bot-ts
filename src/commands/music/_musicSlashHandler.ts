import { BahamutCommandUsage, CommandConfig, FileData } from "../../../typings.js";
import { CommandType } from "wokcommands";
import { getAllJSFiles } from "../../lib/toolFunctions.js";
import { handleErrorResponseToMessage } from "../../lib/messageHandlers.js";
import Discord from "discord.js";

import url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let allMusicCommands: FileData[] = [];

// This is a Slash command handler for all music commands

const config: CommandConfig = {
    name: "music",
    aliases: ["m"],
    type: CommandType.SLASH,
    description: "Manage music on this server.",
    options: [],
    minArgs: 0,
    category: "Music",
    guildOnly: true,
    testOnly: false,
    // Set this to false, so WOKCommand doesn't apply any deferring
    deferReply: false,
};

export default {
    ...config,
    init: async function() {
        allMusicCommands = (await getAllJSFiles(__dirname)).filter(e => e.filePath !== __filename);

        this.options = allMusicCommands.filter(e => e.fileContents.type !== CommandType.SLASH).map(e => {
                return {
                    name: e.fileContents.name,
                    type: Discord.ApplicationCommandOptionType.Subcommand,
                    description: e.fileContents.description,
                    options: e.fileContents.options || [],
                };
            });
    },
    callback: async ({ client, channel, member, message, args, interaction, ...rest }: BahamutCommandUsage) => {
        try {
            // @ts-ignore
            const cmd = allMusicCommands.filter(e => e.fileContents.name === interaction!.options.getSubcommand(false));

            if (!cmd || cmd.length < 1) return handleErrorResponseToMessage(client, message! || interaction!, false, config.deferReply, "This command is not available!");

            const cmnd = cmd[0];

            // Implement own check for deferring
            if (interaction && cmnd.fileContents.deferReply) {
                await interaction.deferReply({
                    ephemeral: cmnd.fileContents.deferReply === "ephemeral",
                });
            }

            // Call subcommand with all params
            return await cmnd.fileContents.callback({ client, channel, member, args, interaction, ...rest });
        } catch (ex) {
            console.error("Error while handling music slash command:", ex);
            return handleErrorResponseToMessage(client, message || interaction!, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
        }
    },
};