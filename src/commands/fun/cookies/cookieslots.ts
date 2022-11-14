import { randomIntBetween } from "../../../lib/toolFunctions";
import { CommandConfig } from "../../../../typings";
import { CommandType } from "wokcommands";
import BahamutClient from "../../../modules/BahamutClient";
import Discord from "discord.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../../lib/messageHandlers";
const { generateSlotsEmbed } = require("../../../lib/slotsFunctions");
const { isInt } = require("../../../lib/validateFunctions");

const config: CommandConfig = {
    name: "cookieslots",
    aliases: ["slots"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Play the slot machine with your cookies.",
    category: "Fun",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, interaction, member }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, interaction: Discord.CommandInteraction, member: Discord.GuildMember }) => {
        const cookies = await client.bahamut.dbHandler.cookie.getDBUserCookies(channel.guild, member),
            // eslint-disable-next-line no-useless-escape
            emojis = ["\:cherries:", "\:watermelon:", "\:tangerine:", "\:strawberry:", "\:grapes:", "\:kiwi:"];

        if (!cookies || (isInt(cookies) && cookies === 0)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You don't have any cookies! You need at least **10** cookies to play the slot machine!");
        if (isInt(cookies) && (cookies) < 10) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You don't have enough cookies! You need at least **10** cookies to play the slot machine!");

        handleResponseToMessage(client, message || interaction, false, config.deferReply, { embeds: [generateSlotsEmbed(client, emojis, [])] }).then((msg) => {
            const resultEmojis: string[] = [];
            for (let i = 0; i < 3; i++) {
                resultEmojis.push(emojis[randomIntBetween(0, 2)]);
            }

            setTimeout(async () => {
                const embed = generateSlotsEmbed(client, emojis, resultEmojis);

                if (resultEmojis[0] === resultEmojis[1] && resultEmojis[0] === resultEmojis[2]) {
                    if (await client.bahamut.dbHandler.cookie.addDBCookiesToUser(channel.guild, member, 100)) {
                        return handleResponseToMessage(client, msg, true, config.deferReply, {
                            // eslint-disable-next-line no-useless-escape
                            content: `${message.author} spent **10** \:cookie: to play the slots... and won, big time! \:smiley:\n**100** \:cookie: cookies have been added to your account!`,
                            embeds: [embed],
                        });
                    } else {
                        return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
                    }
                } else if (resultEmojis[0] === resultEmojis[1] || resultEmojis[0] === resultEmojis[2] || resultEmojis[1] === resultEmojis[2]) {
                    if (await client.bahamut.dbHandler.cookie.setDBUserCookieData(channel.guild, member, 10)) {
                        return handleResponseToMessage(client, msg, true, config.deferReply, {
                            // eslint-disable-next-line no-useless-escape
                            content: `${message.author} spent **10** \:cookie: to play the slots... and almost won! \:neutral_face:`,
                            embeds: [embed],
                        });
                    } else {
                        return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
                    }
                } else if (await client.bahamut.dbHandler.cookie.subDBCookiesFromUser(channel.guild, member, 10)) {
                    return handleResponseToMessage(client, msg, true, config.deferReply, {
                        // eslint-disable-next-line no-useless-escape
                        content: `${message.author} spent **10** \:cookie: to play the slots... and lost! \:slight_frown:`,
                        embeds: [embed],
                    });

                } else {
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
                }
            }, 3000);
        }).catch((err) => {
            console.error("Error while playing cookie slots:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
        });
        return;
    },
};