import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";

export default async (member: Discord.GuildMember, client: BahamutClient) => {
    // Handle premium settings of premium user leaves a guild
    await client.bahamut.premiumHandler.handleGuildMemberRemove(member.guild, member);
};
