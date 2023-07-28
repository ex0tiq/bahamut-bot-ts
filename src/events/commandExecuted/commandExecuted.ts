// eslint-disable-next-line no-unused-vars
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";

export default async ({
                          fullCommand,
                          message,
                          client,
                          args,
                          guild,
                          member,
                          channel,
                          interaction,
                      }: { fullCommand: string, message: Discord.Message, client: BahamutClient, args: any[], guild: Discord.Guild, member: Discord.GuildMember, channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
    if (message && message.author.bot) return;

    await client.bahamut.dbHandler.commandLog.addDBGuildCommandLog(guild, member, channel, fullCommand, args, !!(interaction));
};
