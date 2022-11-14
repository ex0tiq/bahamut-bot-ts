import { getAllJSFiles, toProperCase } from "../../lib/toolFunctions";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";

const allEmoteCommands = (() => getAllJSFiles(__dirname).filter(e => e.filePath !== __filename))();

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
    category: "Emotes",
    guildOnly: true,
    testOnly: true,
    deferReply: true,
};

export default {
    ...config,
    autocomplete: () => {
        return ["List"].concat(allEmoteCommands.map(e => toProperCase(e.fileContents.name)));
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
                const emote = interaction.options.get("emote")?.value, target = interaction.options.get("user")?.value || [];
                if (!emote) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This command is not available!");

                // @ts-ignore
                const cmdArr = allEmoteCommands.filter(e => e.fileContents.name.toLowerCase() === emote.toLowerCase());
                if (!cmdArr || cmdArr.length < 1) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This command is not available!");

                const cmd = cmdArr[0];

                // Call subcommand with all params
                return await cmd.fileContents.callback({ message, args: [target].concat(args), client, interaction, channel, ...rest });
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