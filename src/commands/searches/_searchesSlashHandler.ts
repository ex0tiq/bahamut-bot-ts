import { getAllJSFiles } from "../../lib/toolFunctions";
import { BahamutCommandUsage, CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import { handleErrorResponseToMessage } from "../../lib/messageHandlers";

const allSearchCommands = (() => getAllJSFiles(__dirname).filter(e => e.filePath !== __filename))();

// This is a Slash command handler for all music commands

const config: CommandConfig = {
    name: "searches",
    aliases: ["search", "s"],
    type: CommandType.SLASH,
    description: "Search different stuff.",
    options: (() => {
        return allSearchCommands.filter(e => e.fileContents.type !== CommandType.SLASH).map(e => {
            return {
                name: e.fileContents.name,
                type: 1,
                description: e.fileContents.description,
                options: e.fileContents.options || [],
            };
        });
    })(),
    minArgs: 0,
    category: "Searches",
    guildOnly: true,
    testOnly: false,
    // Set this to false, so WOKCommand doesn't apply any deferring
    deferReply: false,
};

export default {
    ...config,
    callback: async ({ client, channel, member, args, message, interaction, ...rest }: BahamutCommandUsage) => {
        try {
            // @ts-ignore
            const cmd = allSearchCommands.filter(e => e.fileContents.name === interaction!.options.getSubcommand(false));

            if (!cmd || cmd.length < 1) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This command is not available!");

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
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
        }
    },
};