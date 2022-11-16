// eslint-disable-next-line no-unused-vars
import Discord from "discord.js";
import BahamutClient from "../../../modules/BahamutClient";
import { Command } from "wokcommands";

export default async ({ command, message, client, args, guild, member, channel }: { command: Command, message: Discord.Message, client: BahamutClient, args: any[], guild: Discord.Guild, member: Discord.GuildMember, channel: Discord.TextChannel }) => {
    if (message && message.author.bot) return;

    await client.bahamut.dbHandler.commandLog.addDBGuildCommandLog(guild, member, channel, command.commandObject.name, args);
};
