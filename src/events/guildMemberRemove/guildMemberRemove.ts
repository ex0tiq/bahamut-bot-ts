import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";

export default async (member: Discord.GuildMember, client: BahamutClient) => {
    // Handle premium settings of premium user leaves a guild
    await client.bahamut.premiumHandler.handleGuildMemberRemove(member.guild, member);
};
