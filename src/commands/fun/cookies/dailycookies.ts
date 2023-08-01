import { randomIntBetween } from "../../../lib/toolFunctions.js";
import { CommandConfig } from "../../../../typings.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../../modules/BahamutClient.js";
import Discord from "discord.js";
import { DateTime } from "luxon";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "dailycookies",
    aliases: ["dlc"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get a random amount of cookies per day.",
    category: "Fun (/fun)",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const rand = randomIntBetween(15, 25), userStats = await client.bahamut.dbHandler.guildUserStat.getDBGuildUserStats(channel.guild, member),
            cookieStats: any[] = [];

        if (userStats?.has("cookies")) {
            cookieStats.push(userStats.get("cookies")?.val || 0);
            cookieStats.push(userStats.get("cookies")?.updatedAt || new Date);
        } else {
            cookieStats.push(0);
            cookieStats.push(new Date);
        }

        if (cookieStats.length > 0) {
            const date = DateTime.fromJSDate(cookieStats[1]);
            if (date.hasSame(DateTime.now(), "day")) {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `${message.author}, you already collected your cookies for today!`);
            }
        }

        if (await client.bahamut.dbHandler.cookie.addDBCookiesToUser(channel.guild, member, rand)) {
            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({ name: "Daily Cookies", iconURL: client.bahamut.config.cookie_images.icon })
                        .setDescription(`${message.author}, you collected your **${rand}** cookies for today!`),
                ],
            });
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
        }
    },
};