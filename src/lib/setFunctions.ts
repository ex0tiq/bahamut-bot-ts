import BahamutClient from "../modules/BahamutClient";

const setGuildOptions = async (client: BahamutClient, guild: string, options: any) => {
    if (!client.guilds.cache.has(guild)) return null;

    options = JSON.parse(options);

    return (await client.bahamut.dbHandler.guildSettings.setDBGuildSettings(guild, options));
};

export { setGuildOptions };