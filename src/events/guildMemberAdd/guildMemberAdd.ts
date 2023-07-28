// eslint-disable-next-line no-unused-vars
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";

export default async (member: Discord.GuildMember, client: BahamutClient) => {
    if (member && member.user.bot) return;

    // Load the guild's settings
    const settings = await getGuildSettings(client, member.guild);

    // If welcome is off, don't proceed (don't welcome the user)
    if (settings.welcome_enabled) {
        // Replace the placeholders in the welcome message with actual data
        const welcomeMessage = settings.welcome_message.replace("{{user}}", member.user.tag);

        // Send the welcome message to the welcome channel
        // There's a place for more configs here.
        // @ts-ignore
        member.guild.channels.cache.find(c => c.name === settings.welcome_channel && c.type === Discord.ChannelType.GuildText)?.send(welcomeMessage).catch(console.error);
    }
};
