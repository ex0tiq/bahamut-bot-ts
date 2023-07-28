import Discord from "discord.js";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import { randomIntBetween } from "../../lib/toolFunctions.js";
import { resolveUser } from "../../lib/resolveFunctions.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";
import BahamutClient from "../../modules/BahamutClient.js";

const config: CommandConfig = {
    name: "rate",
    type: CommandType.LEGACY,
    description: "Rate a user.",
    minArgs: 1,
    expectedArgs: "<user>",
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
    testOnly: false,
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

        let rand = randomIntBetween(1, 10);
        if (target!.id === client.user!.id || target!.id === client.bahamut.config.owner_id) rand = 10;

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "User Rating", iconURL: client.bahamut.config.emoji_icons.thinking })
                    // eslint-disable-next-line no-useless-escape
                    .setDescription(`${target}?..... **${rand}**/10${rand >= 8 ? " \:thumbsup:" : ""}\n\n${"\:star:".repeat(rand)}`),
            ],
        });
    },
};