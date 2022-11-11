import {getAllJSFiles} from '../../lib/toolFunctions';
import {BahamutCommandUsage, CommandConfig} from "../../../typings";
import {CommandType} from "wokcommands";
import {handleErrorResponseToMessage} from "../../lib/messageHandlers";

let allSearchCommands = (() => getAllJSFiles(__dirname).filter(e => e.filePath !== __filename))();

// This is a Slash command handler for all music commands

const config: CommandConfig = {
    name: 'search',
    aliases: ['s'],
    type: CommandType.SLASH,
    description: 'Search different stuff.',
    options: (() => {
        return allSearchCommands.filter(e => e.fileContents.type !== CommandType.SLASH).map(e => {
            return {
                name: e.fileContents.name,
                type: 1,
                description: e.fileContents.description,
                options: e.fileContents.options || []
            };
        })
    })(),
    minArgs: 0,
    category: 'Searches',
    guildOnly: true,
    testOnly: false,
    deferReply: true
};

module.exports = {
    ...config,
    callback: async ({ client, channel, member, args, interaction, ...rest }: BahamutCommandUsage) => {
        try {
            // @ts-ignore
            const cmd = allSearchCommands.filter(e => e.fileContents.name === interaction!.options.getSubcommand(false));

            if (!cmd || cmd.length < 1) return handleErrorResponseToMessage(client, interaction!, false, config.deferReply, 'This command is not available!');

            const cmnd = cmd[0];

            // Call subcommand with all params
            return await cmnd.fileContents.callback({ client, channel, member, args, interaction, ...rest });
        } catch (ex) {
            console.error("Error while handling music slash command:", ex);
            return handleErrorResponseToMessage(client, interaction!, false, config.deferReply, 'An internal error occurred while doing that. Please try again later.');
        }
    },
};