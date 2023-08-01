import { getAllJSFiles, toProperCase } from "../../lib/toolFunctions.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";

import url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

let allEmoteCommands: any[] = [];

// This is a Slash command handler for all emote commands

const config: CommandConfig = {
    name: "emote",
    aliases: ["e"],
    type: CommandType.SLASH,
    description: "Send an emote (use \"list\" to get all available).",
    options: [
        {
            name: "emote",
            description: "Send an emote.",
            type: Discord.ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
        },
        {
            name: "user",
            description: "Optional user to target with emote.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    minArgs: 1,
    category: "Emotes (/emote)",
    guildOnly: true,
    testOnly: false,
    // Set this to false, so WOKCommand doesn't apply any deferring
    deferReply: false,
};

export default {
    ...config,
    init: async () => {
        allEmoteCommands = (await getAllJSFiles(__dirname)).filter(e => e.filePath !== __filename);
    },
    autocomplete: () => {
        return ["List"].concat(allEmoteCommands.filter(e => e.fileContents.type !== CommandType.SLASH).map(e => toProperCase(e.fileContents.name)));
    },
    callback: async ({ message, args, client, interaction, channel, ...rest }: { message: Discord.Message, args: any[], client: BahamutClient, interaction: Discord.CommandInteraction, channel: Discord.TextChannel }) => {
        try {
            if (args[0].toLowerCase() === "list") {
                let emoteText = "";

                for (let i = 0; i < allEmoteCommands.length; i++) {
                    emoteText += `• ${toProperCase(allEmoteCommands[i].fileContents.name).trim()}\n`;
                }

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setTitle("Available emotes")
                            .setDescription(emoteText),
                    ],
                });
            }

            try {
                const emote = interaction.options.get("emote")?.value;
                if (!emote) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This command is not available!");

                // @ts-ignore
                const cmdArr = allEmoteCommands.filter(e => e.fileContents.name.toLowerCase() === emote.toLowerCase());
                if (!cmdArr || cmdArr.length < 1) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This command is not available!");

                const cmd = cmdArr[0];

                // Implement own check for deferring
                if (interaction && cmd.fileContents.deferReply) {
                    await interaction.deferReply({
                        ephemeral: cmd.fileContents.deferReply === "ephemeral",
                    });
                }

                // Call subcommand with all params
                return await cmd.fileContents.callback({ message, args: args.slice(1), client, interaction, channel, ...rest });
            } catch (ex) {
                console.error("Error running Emote slash command handler:", ex);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
            }
        } catch (ex) {
            console.error("Error running Emote slash command handler:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
        }
    },
};