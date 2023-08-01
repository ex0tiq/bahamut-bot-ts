import { CommandConfig } from "../../../typings.js";
import { getAllWorlds, getData } from "../../lib/ffxivWorldStatusFunctions.js";
import { serverEmbed, worldEmbed } from "../../lib/ffxivWorldStatusEmbeds.js";
import Discord from "discord.js";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "worldstatus",
    aliases: ["world"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get the current status of a FFXIV world or datacenter.",
    expectedArgs: "<worldname-or-list>",
    options: [
        {
            name: "world",
            description: "World to get current status for.",
            type: Discord.ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
        },
    ],
    category: "FFXIV (/ffxiv)",
    guildOnly: true,
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    deferReply: true,
};

export default {
    ...config,
    autocomplete: async () => {
        return (await getAllWorlds()).map(a => a.name).sort((a, b) => a.localeCompare(b));
    },
    callback: async ({ client, message, args, channel, interaction }: { client: BahamutClient, message: Discord.Message, args: any[], channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        if (args.length <= 0 || args[0].toLowerCase() === "list") {
            const worlds = await getAllWorlds();

            let worldsString = "";
            for (const w of worlds.sort((a, b) => a.name.localeCompare(b.name))) {
                worldsString += `• ${w.name}\n`;
            }

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle("Available Worlds")
                        .setDescription(worldsString),
                ],
            });
        }

        const data = await getData(args[0]);
        if (!data) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Invalid input. No status found for world \`${args[0]}\`!`);

        if (data.type === "world") {
            return handleResponseToMessage(client, message || interaction, false, config.deferReply, worldEmbed(data.data, client));
        }
        if (data.type === "server") {
            return handleResponseToMessage(client, message || interaction, false, config.deferReply, serverEmbed(data.data, client));
        }

        // if (data.type === 'region') {
        //     return 'Region';
        // }

        return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "I was unable to fetch a status. Make sure your query is valid.");
    },
};