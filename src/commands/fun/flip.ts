import BahamutClient from "../../modules/BahamutClient";
import { flipString } from "../../lib/toolFunctions";
import Discord from "discord.js";
import { resolveUser } from "../../lib/resolveFunctions";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";

const config: CommandConfig = {
    name: "flip",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Flip someone.",
    minArgs: 1,
    expectedArgs: "<someone>",
    options: [
        {
            name: "user",
            description: "User to flip.",
            type: Discord.ApplicationCommandOptionType.User,
            required: true,
        },
    ],
    category: "Fun",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], interaction: Discord.CommandInteraction }) => {
        let target;

        if (args.length > 0) {
            if (message && message.mentions.members!.size > 0) {
                target = message.mentions.members?.first();
            } else if (!message && args.length > 0) {
                if (args[0] instanceof Discord.GuildMember) {
                    target = args[0];
                } else {
                    target = await resolveUser(client, args[0], channel.guild);
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setDescription(`(╯°□°）╯︵ ${flipString(target!.displayName)}`),
            ],
        });
    },
};