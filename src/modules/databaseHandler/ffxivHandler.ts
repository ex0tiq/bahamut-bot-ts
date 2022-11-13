import BahamutDBHandler, { DBGuildCharacters } from "../BahamutDBHandler";
import Discord from "discord.js";

export default class FFXIVHandler {
    // DB Handler instance
    private _dbHandler: BahamutDBHandler;

    constructor(dbHandler: BahamutDBHandler) {
        this._dbHandler = dbHandler;
    }

    /**
     * Get linked ffxiv character of guild member
     * @param guild
     * @param user
     * @returns {Promise<null|*>}
     */
    getDBGuildFFXIVCharacterID = async (guild: Discord.Guild, user: Discord.GuildMember) => {
        return new Promise((resolve) => {
            return DBGuildCharacters
                .findAll({
                    attributes: ["lodestone_char"],
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id,
                    },
                })
                .then(async (obj: DBGuildCharacters[] | null) => {
                    if (obj) resolve(obj[0].lodestone_char);
                    else resolve(null);
                }).catch(e => {
                    console.error("Error while retrieving guild ffxiv char:", e);
                    resolve(null);
                });
        });
    };

    /**
     * Save ffxiv character of guild member
     * @param guild
     * @param {string|int} lodestoneCharID
     * * @param {string|null} user
     * @returns {Promise<boolean>}
     */
    saveGuildFFXIVCharacterID = async (guild: Discord.Guild, user: Discord.GuildMember, lodestoneCharID: string) => {
        return new Promise((resolve) => {
            return DBGuildCharacters
                .findOne({
                    where: {
                        guild_id: guild.id,
                        guild_user: user.user.id,
                    } })
                .then(async (obj: DBGuildCharacters | null) => {
                    if (obj) {
                        // update
                        await obj.update({
                            lodestone_char: lodestoneCharID,
                        });
                    } else {
                        // insert
                        await DBGuildCharacters.create({
                            guild_id: guild.id,
                            guild_user: user.user.id,
                            lodestone_char: lodestoneCharID,
                        });
                    }

                    resolve(true);
                }).catch(e => {
                    console.error("Error while saving guild ffxiv char:", e);
                    resolve(false);
                });
        });
    };
}