// import { handleBotMessage, getSettingChangedConfirmEmbed } from "../lib/messageConstructors";
import {
    handleErrorResponseToMessage,
    handleResponseToMessage,
    handleSuccessResponseToMessage,
} from "../lib/messageHandlers";
import Discord from "discord.js";
import BahamutClient from "../modules/BahamutClient";
import { getGuildSettings } from "../lib/getFunctions";
import { CommandType, CooldownTypes } from "wokcommands";
import { isUserAdminOfGuild } from "../lib/checkFunctions";

const config = {
    name: "prefix",
    type: CommandType.BOTH,
    description: "Set this bots prefix on this server.",
    maxArgs: 1,
    expectedArgs: "[prefix]",
    options: [
        {
            name: "prefix",
            description: "Set the new bot prefix for this server.",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    category: "System",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.GuildTextBasedChannel, args: string[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);

        if (args.length <= 0) {
            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                "embeds": [
                    new Discord.EmbedBuilder()
                        .setTitle("Prefix")
                        .setDescription(`The current bot prefix on this server is \`${settings.prefix}\`.`),
                ],
            });
        }
        else {
            if (!(await isUserAdminOfGuild(client, member, channel.guild))) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You don't have permission to do that.");
            if (args[0].length > 4) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Prefix can only be up to four characters.");

            if (settings.prefix === args[0].toLowerCase()) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "The prefix is already set to that.");

            if (await client.bahamut.dbHandler.guildSettings.setDBGuildSetting(channel.guild, "prefix", args[0].toLowerCase())) {
                client.bahamut.settings.set(channel.guild.id, await client.bahamut.dbHandler.guildSettings.getDBGuildSettings(channel.guild));

                client.bahamut.cmdHandler.commandHandler.prefixHandler.set(channel.guild.id, args[0].toLowerCase());

                return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `Successfully changed the value of \`Prefix\` to \`${args[0].toLowerCase()}\`!`);
            }
            else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while updating the Prefix. Please try again later!");
            }
        }
    },
};