import { handleErrorResponseToMessage, handleResponseToMessage } from "../lib/messageHandlers.js";
import BahamutClient from "../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../lib/getFunctions.js";
import WOK, { Command, CommandType } from "wokcommands";
import { CommandConfig } from "../../typings.js";
import { basename } from "path";


const config: CommandConfig = {
	name: "help",
	aliases: ["h", "halp"],
    type: CommandType.BOTH,
	description: "Displays all the available commands for your permission level.",
    minArgs: 0,
	expectedArgs: "[command]",
    options: [
        {
            name: "command",
            description: "Command name",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true,

        },
    ],
	category: "System",
	guildOnly: true,
    testOnly: false,
    deferReply: true,
};


export default {
	...config,
    autocomplete: (_command: any, _option: any, _interaction: any, _client: any, instance: { commandHandler: { commands: Map<string, Command>; }; }) => {
        try {
            const sortedCommands = Array.from((instance.commandHandler.commands as Map<string, Command>).entries())
                .filter(([key, val]) => key === val.commandObject.name && !basename(val.filePath).startsWith("_"))
                .sort(([aa], [ba]) => aa.localeCompare(ba));

            return sortedCommands.map(([key]) => key);
        } catch (ex) {
            return [];
        }
    },
	callback: async ({
        client,
        instance,
        message,
        channel,
        args,
        interaction,
    }: { client: BahamutClient, instance: WOK, message: Discord.Message, channel: Discord.TextChannel, args: string[], interaction: Discord.CommandInteraction }) => {
		const settings = await getGuildSettings(client, channel.guild);

		if (!args[0]) {
            const sortedCommands = Array.from((instance.commandHandler.commands as Map<string, Command>).entries())
                .filter(([key, val]) => key === val.commandObject.name && !basename(val.filePath).startsWith("_"))
                .sort(([aa], [ba]) => aa.localeCompare(ba)),
                categories = new Map<string, Command[]>(Object.entries({
                    default: [],
                }));
            
            // fill categories with commands
            for (const [, cmd] of sortedCommands) {
                categories.set(cmd.commandObject.category || "default", [...(categories.get(cmd.commandObject.category!) || [])!, cmd]);
            }

            const embed = new Discord.EmbedBuilder()
                .setAuthor({ name: "Available Commands", iconURL: client.bahamut.config.message_icons.info })
                .setDescription(`The current legacy bot prefix on this server is \`${settings.prefix}\``)
                .setFooter({ text: "For more information try /help (command), e.g. /help play." });

            const embeds: Discord.APIEmbedField[] = [];

            Array.from(categories.entries()).sort(([a1], [a2]) => a1.localeCompare(a2)).forEach(([cat, cmds]) => {
                const availableCommands = cmds.filter(e => !e.commandObject.hidden && !e.commandObject.testOnly && !e.commandObject.ownerOnly);
                if (availableCommands.length > 0) embeds.push({ name: `${cat}`, value: `\`${availableCommands.map(e => e.commandObject.name).join("`, `")}\`` });
            });

            embed.addFields(embeds);


            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [embed],
            });
		} else if (instance.commandHandler.commands.has(args[0].toLowerCase())) {
            const command = instance.commandHandler.commands.get(args[0].toLowerCase()) as Command;
            if (command.commandObject.hidden || command.commandObject.testOnly || command.commandObject.ownerOnly) {return;}

            const embed = new Discord.EmbedBuilder()
                .setTitle(`Command: ${command.commandObject.name}`)
                .setDescription(command.commandObject.description || null),
                fields = [];

            if (command.commandObject.aliases && command.commandObject.aliases.length > 1) {
                fields.push({ name: "Aliases", value: `${command.commandObject.aliases.join(", ")}` });
            }
            embed.addFields([ 
                ...fields, 
                { name: "Usage", value: `\`${(command.commandObject.type === CommandType.LEGACY) ? settings.prefix : "/"}${command.commandObject.name} ${command.commandObject.expectedArgs || ""}\`` },
            ]);

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [embed],
            });
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, true, "This command does not exist.");
        }
	},
};