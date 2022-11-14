import { CommandConfig } from "../../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import { resolveUser } from "../../../lib/resolveFunctions";
import BahamutClient from "../../../modules/BahamutClient";
import Discord from "discord.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../../lib/messageHandlers";

const config: CommandConfig = {
    name: "cookieleaderboard",
    aliases: ["cooldr"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get the cookie leaderboard.",
    category: "Fun",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
        let result;

        if ((result = await client.bahamut.dbHandler.cookie.getDBGuildCookieRanking(channel.guild, 10, false))) {
            let i = 1;
            const msg = new Discord.EmbedBuilder()
                // eslint-disable-next-line no-useless-escape
                .setAuthor({ name: "Cookie Leaderboard", iconURL: client.bahamut.config.cookie_images.leaderboard_icon })
                .setThumbnail(channel.guild.iconURL() ? channel.guild.iconURL() : null);

            for (const rank of result) {
                let usr = null;
                if ((usr = (await resolveUser(client, rank.user, channel.guild)))) {
                    msg.addFields({ name: `${i}. ${usr.displayName}`, value: `**${rank.cookies}** Cookies` });
                    i++;
                }
            }

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [msg],
            });
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "No data available for cookie ranking.");
        }
    },
};