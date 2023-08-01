import Discord from "discord.js";
import { createShipImage } from "../../lib/canvasFunctions.js";
import { randomIntBetween } from "../../lib/toolFunctions.js";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import { resolveUser } from "../../lib/resolveFunctions.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "ship",
    type: CommandType.LEGACY,
    description: "Ship two users.",
    minArgs: 2,
    expectedArgs: "<user-1> <user-2>",
    options: [
        {
            name: "user-1",
            description: "User 1",
            type: Discord.ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "user-2",
            description: "User 2",
            type: Discord.ApplicationCommandOptionType.User,
            required: true,
        },
    ],
    category: "Fun (/fun)",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], interaction: Discord.CommandInteraction }) => {
        let user1, user2;

        if (args.length > 0) {
            if (message && message.mentions.members!.size > 1) {
                const t = [...message.mentions.members!.values()];

                user1 = t[0];
                user2 = t[1];
            } else if (!message && args.length > 1) {
                if (args[0] instanceof Discord.GuildMember) {
                    user1 = args[0];
                } else {
                    user1 = await resolveUser(client, args[0], channel.guild);
                }
                if (args[1] instanceof Discord.GuildMember) {
                    user2 = args[1];
                } else {
                    user2 = await resolveUser(client, args[1], channel.guild);
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
        }

        if (!user1 || !user2) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));

        let text = "";
        const percent = randomIntBetween(1, 100), shipImage = await createShipImage({
            user1: user1,
            user2: user2,
            shipPercent: percent,
        });

        if (!shipImage) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while creating ship data. Please try again later.");

        if (percent <= 25) {
            text = `${user1} and ${user2}... don't even try. Better luck next time.`;
        } else if (percent <= 50) {
            text = `${user1} and ${user2}... not bad... but also not good.`;
        } else if (percent <= 75) {
            text = `${user1} and ${user2}... the odds are in your favour.`;
        } else if (percent <= 90) {
            text = `${user1} and ${user2}... you really should move in together.`;
        } else if (percent <= 100) {
            text = `${user1} and ${user2}... when and where is the event?`;
        } else {
            text = `${user1} and ${user2}... the cake is a lie!.`;
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            content: text,
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: "Shipping", iconURL: client.bahamut.config.emoji_icons.heart })
                    .setDescription(text)
                    .setImage("attachment://ship.png"),
            ],
            files: [(new Discord.AttachmentBuilder(shipImage, { name: "ship.png" }))],
        });
    },
};