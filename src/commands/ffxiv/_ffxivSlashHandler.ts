import { getAllJSFiles } from "../../lib/toolFunctions.js";
import { CommandConfig, FileData } from "../../../typings.js";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { handleErrorResponseToMessage } from "../../lib/messageHandlers.js";

import url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

let allFFXIVCommands: FileData[] = [];

// This is a Slash command handler for all ffxiv commands

const config: CommandConfig = {
    name: "ffxiv",
    aliases: ["xiv"],
    type: CommandType.SLASH,
    description: "Different commands related to FF XIV.",
    options: [],
    minArgs: 0,
    category: "FFXIV (/ffxiv)",
    guildOnly: true,
    testOnly: false,
    // Set this to false, so WOKCommand doesn't apply any deferring
    deferReply: false,
};

export default {
    ...config,
    init: async function() {
        allFFXIVCommands = (await getAllJSFiles(__dirname)).filter(e => e.filePath !== __filename);

        this.options = allFFXIVCommands.filter((e: { fileContents: { type: any; }; }) => e.fileContents.type !== CommandType.SLASH).map((e: { fileContents: { name: any; description: any; options: any; }; }) => {
                return {
                    name: e.fileContents.name,
                    type: Discord.ApplicationCommandOptionType.Subcommand,
                    description: e.fileContents.description,
                    options: e.fileContents.options || [],
                };
            });
    },
    autocomplete: (command: string, optionName: string, interaction: Discord.CommandInteraction) => {
        try {
            // @ts-ignore
            const cmdArr = allFFXIVCommands.filter(e => e.fileContents.name === interaction.options.getSubcommand(false));

            if (!cmdArr || cmdArr.length < 1) return [];

            const cmd = cmdArr[0];

            // Call subcommand with all params
            return cmd.fileContents.autocomplete(command, optionName, interaction);
        } catch (ex) {
            return [];
        }
    },
    callback: async ({ message, args, client, interaction, channel, ...rest }: { message: Discord.Message, args: any[], client: BahamutClient, interaction: Discord.CommandInteraction, channel: Discord.TextChannel }) => {
        try {
            // @ts-ignore
            const cmdArr = allFFXIVCommands.filter(e => e.fileContents.name === interaction.options.getSubcommand(false));
            if (!cmdArr || cmdArr.length < 1) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This command is not available!");

            const cmd = cmdArr[0];

            // Implement own check for deferring
            if (interaction && cmd.fileContents.deferReply) {
                await interaction.deferReply({
                    ephemeral: cmd.fileContents.deferReply === "ephemeral",
                });
            }

            // Call subcommand with all params
            return await cmd.fileContents.callback({ message, args, client, interaction, channel, ...rest });
        } catch (ex) {
            console.error("Error running FFXIV slash command handler:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
        }
    },
};