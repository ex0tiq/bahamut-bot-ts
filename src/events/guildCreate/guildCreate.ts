import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import logger from "../../modules/Logger";

export default (client: BahamutClient, guild: Discord.Guild) => {
    logger.cmd(client.shardId, `[GUILD JOIN] ${guild.name} (${guild.id}) added the bot.`);
};
