import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";

export default async (oldMember: Discord.GuildMember, newMember: Discord.GuildMember, client: BahamutClient) => {
    // Call guildMember update function
    await client.bahamut.premiumHandler.handleUpdateUserRoles(newMember.guild, oldMember, newMember);
};
