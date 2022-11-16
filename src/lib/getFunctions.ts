import BahamutClient from "../modules/BahamutClient";
import Discord from "discord.js";
import { GuildSettings } from "../../typings";
import { resolveRole } from "./resolveFunctions";
import { isUserAdminOfGuild, isUserModOfGuild } from "./checkFunctions";
import { bigintValuesToString } from "./toolFunctions";


const getGuildSettings = async (client: BahamutClient, guild: Discord.Guild | string | undefined, forceDb = false, resolveRoles = false, resolveChannels = false, adminRoles = false): Promise<GuildSettings> => {
    if (!guild) return client.bahamut.config.defaultSettings;
    let guildConf: GuildSettings | null | undefined;

    if (typeof guild === "string") guild = client.guilds.cache.get(guild);
    if (!guild) return client.bahamut.config.defaultSettings;

    if (forceDb) {
        guildConf = await client.bahamut.dbHandler.guildSettings.getDBGuildSettings(guild);
    } else {
        guildConf = (client.bahamut.settings.has(guild.id) ? client.bahamut.settings.get(guild.id) : null);
        if (!guildConf) guildConf = (await getGuildSettings(client, guild, true, resolveRoles, resolveChannels, adminRoles));
    }

    if (!guildConf) return client.bahamut.config.defaultSettings;

    guildConf = ({ ...client.bahamut.config.defaultSettings, ...guildConf });

    if (resolveRoles) {
        let obj;
        if (Array.from(obj = guildConf.character_verify_achievement_roles.entries()).length > 0) {
            const tmp: Map<string, Discord.Role> = new Map<string, Discord.Role>;
            for (const [achievement, role] of obj) {
                const r = await resolveRole(client, role, guild);
                if (r) tmp.set(achievement, r);
            }
            guildConf.character_verify_achievement_roles = tmp;
        }
        if (Array.from(obj = guildConf.user_level_roles.entries()).length > 0) {
            const tmp: Map<number, Discord.Role> = new Map<number, Discord.Role>;
            for (const [level, role] of obj) {
                const r = await resolveRole(client, role, guild);
                if (r) tmp.set(level, r);
            }
            guildConf.user_level_roles = tmp;
        }

        if (adminRoles) {
            guildConf.admin_roles = [];
            guild.roles.cache.each((e) => {
                if (e.permissions.has(Discord.PermissionFlagsBits.Administrator)) guildConf?.admin_roles.push(e.id);
            });
        }
    }

    return guildConf;
};

const getUserGuilds = async (client: BahamutClient, user: Discord.User | string) => {
    const arr = [];

    for (const [id, g] of client.guilds.cache.entries()) {
        // if (client.config.owner_id === user) {
        //    g.modOnly = false;
        //    arr.push(g);
        //    continue;
        // }

        const group = {
            id: g.id,
            name: g.name,
            icon: g.iconURL({ forceStatic: true, extension: "png" }),
            acronym: g.nameAcronym,
            modOnly: false,
            premium: false,
        };

        const settings = await getGuildSettings(client, id);

        group.premium = (!!settings.premium_user);

        if (await isUserAdminOfGuild(client, (typeof user === "string" ? user : user.id), g)) {
            group.modOnly = false;
            arr.push(group);
        } else if (await isUserModOfGuild(client, (typeof user === "string" ? user : user.id), g)) {
            group.modOnly = true;
            arr.push(group);
        }
    }

    return arr.map((e) => {
        return bigintValuesToString({
            "id": e.id,
            "name": e.name,
            "icon": e.icon,
            "acronym": e.acronym,
            "modOnly": e.modOnly,
            "premium": e.premium,
        });
    });
};

const getGuildDetails = async (client: BahamutClient, guild: string | Discord.Guild, user: string | Discord.User, withAchievements = false, language = "en") => {
    if (!client.guilds.cache.has(typeof guild == "string" ? guild : guild.id)) return null;

    const g = client.guilds.cache.get(typeof guild == "string" ? guild : guild.id),
        roles: { [key: string]: { name: string, position: number } } = {},
        channels: { [key: string]: { name: string, position: number } } = {};

    if (!g) return null;

    for (const r of [...g.roles.cache.values()].filter(e => e.rawPosition !== 0).sort((e1, e2) => e2.rawPosition - e1.rawPosition)) {
        roles[`${r.id}`.trim()] = {
            "name": r.name,
            "position": r.rawPosition,
        };
    }
    for (const c of [...g.channels.cache.values()].filter(e => e.type === Discord.ChannelType.GuildText)) {
        channels[`${c.id}`.trim()] = {
            "name": c.name,
            "position": ("rawPosition" in c) ? c.rawPosition : 0,
        };
    }

    let modOnly = false;

    if (await isUserAdminOfGuild(client, (typeof user === "string" ? user : user.id), g)) {
        modOnly = false;
    } else if (await isUserModOfGuild(client, (typeof user === "string" ? user : user.id), g)) {
        modOnly = true;
    } else {
        return null;
    }

    let achievements = null;
    if (withAchievements) {
        achievements = await client.bahamut.ffxiv.getAchievements(language);
    }

    return bigintValuesToString({
        "id": g.id,
        "name": g.name,
        "icon": g.iconURL({ forceStatic: true, extension: "png" }),
        "acronym": g.nameAcronym,
        "settings": (await getGuildSettings(client, g, false, true, true)),
        "roles": roles,
        "channels": channels,
        "modOnly": modOnly,
        "achievements": achievements,
    });
};

export { getGuildSettings, getUserGuilds, getGuildDetails };