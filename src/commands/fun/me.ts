import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { handleResponseToMessage } from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "me",
    type: CommandType.LEGACY,
    description: "Write something from your perspective.",
    minArgs: 1,
    expectedArgs: "<something>",

    category: "Fun",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, args, member, interaction }: { client: BahamutClient, message: Discord.Message, args: any[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setAuthor({ name: member.displayName, iconURL: member.avatarURL() || member.user.avatarURL() || member.user.defaultAvatarURL })
                    .setDescription(args.join(" ")),
            ],
        });
    },
};