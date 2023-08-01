import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";
import { randomIntBetween } from "../../lib/toolFunctions.js";
import lang from "../../lib/languageMessageHandlers.js";

const config: CommandConfig = {
    name: "pout",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Pout emote",
    category: "Emotes (/emote)",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        try {
            const res = await client.bahamut.tenor.Search.Query("pout", "30");

            const rand = randomIntBetween(0, 29);
            const post = res[rand];

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setDescription(await lang.getMessage(client, channel.guild, "commands_emotes_pout_text", {
                            user1: member.toString(),
                        }) || "")
                        .setImage(post.media_formats.gif.url || null)
                        .setFooter({ text: "Via Tenor" }),
                ],
            });
        } catch (ex) {
            console.error("Error fetching gif from Tenor:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_fetching_gif"));
        }
    },
};