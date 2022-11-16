import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";

export default async (client: BahamutClient, member: Discord.GuildMember) => {
    // Handle premium settings of premium user leaves a guild
    await client.bahamut.premiumHandler.handleGuildMemberRemove(member.guild, member);
};
