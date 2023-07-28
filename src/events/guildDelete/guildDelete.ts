import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import logger from "../../modules/Logger.js";

export default async (guild: Discord.Guild, client: BahamutClient) => {
    if (!guild.available) return;

    logger.cmd(client.shardId, `[GUILD LEAVE] ${guild.name} (${guild.id}) removed the bot.`);

    // Delete all premium settings if the bot leaves a guild
    await client.bahamut.premiumHandler.handleGuildDelete(guild);
};
