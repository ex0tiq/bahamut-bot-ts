import { FFXIVWorldData } from "../../typings.js";
import BahamutClient from "../modules/BahamutClient.js";
import Discord from "discord.js";
import { hexToRGB } from "./toolFunctions.js";

const region: any = {
    jp: {
        longName: "Japan",
        emoji: "🇯🇵",
    },
    na: {
        longName: "North America",
        emoji: "🇺🇸",
    },
    eu: {
        longName: "Europe",
        emoji: "🇪🇺",
    },
    au: {
        longName: "Oceania",
        emoji: "🇦🇺",
    },
};

const status: any = {
    "Online": {
        color: 8047698,
        emoji: "<:online:859344586815438889>",
    },
    "Partial Maintenance": {
        color: 13414963,
        emoji: "<:partially_offline:859344049676877824>",
    },
    "Maintenance": {
        color: 14566211,
        emoji: "<:offline:859343177534275624>",
    },
};

const worldEmbed = (world: FFXIVWorldData, client: BahamutClient | null) => {
    return {
        embeds: [
            new Discord.EmbedBuilder()
                .setTitle(world.name)
                .setDescription(`${world.server} | ${region[world.region].emoji}`)
                .setColor((client ? client.bahamut.config.primary_message_color : status[world.status].color))
                .setFields(
                    { name: "Status", value: `${status[world.status].emoji} ${world.status}` },
                    {
                        name: "New Character Creation",
                        // eslint-disable-next-line no-useless-escape
                        value: world.createCharacter ? "\:white_check_mark: Available" : "\:x: Unavailable",
                    },
                    { name: "Category", value: world.category }
                )
                .setFooter({ text: `Region: ${region[world.region].longName}` }),
        ],
    };
};

const serverEmbed = (server: any, client: BahamutClient) => {
    const fields = [];
    for (const world of server.worlds) {
        // eslint-disable-next-line no-useless-escape
        fields.push(`${status[world.status].emoji}${world.createCharacter ? "\:white_check_mark:" : "\:x:"} **${world.name}** - ${world.category}`);
    }

    return {
        embeds: [
            new Discord.EmbedBuilder()
                .setTitle(server.name)
                // @ts-ignore
                .setColor(hexToRGB(client.bahamut.config.primary_message_color))
                .setDescription(`${region[server.region].emoji} ${region[server.region].longName} \n\n ${fields.join("\n")}`),
        ],
    };
};

export {
    worldEmbed,
    serverEmbed,
};

// regionEmbed: (region) => {
//     const fields = [];
//     for (const world of region.server) {
//         fields.push(`${status[world.status].emoji}${world.createCharacter ? '<:chgreen:678340775398080540>' : '<:chred:678340885116878872>'} **${world.name}** - ${world.category}`);
//     }
//     const embed = {
//         title: `${region[region.region].emoji} ${region[region.region].longName}`,
//         description: `${region[region.region].emoji} ${region[region.region].longName} \n\n ${fields.join('\n')}`,
//         timestamp: Date.now(),
//     };

//     return embed;
// },