import { CommandConfig } from "../../../typings.js";
import Discord from "discord.js";
import * as emoji from "node-emoji";
// @ts-ignore
import { default as EorzeaWeather } from "eorzea-weather";
import { CommandType } from "wokcommands";
import { toProperCase } from "../../lib/toolFunctions.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { DateTime } from "luxon";

type ObjectKey = keyof typeof EorzeaWeather;

const convertZoneToString = (zone: string | null) => {
    if (!zone) return "";
    return zone.replace("ZONE_", "").replace(/_/g, " ").split(" ").map(ee => toProperCase(ee)).join(" ");
};
const convertStringToZone = (zoneString: string, returnZoneString = false): string | null => {
    const zone = "ZONE_" + zoneString.replace(/ /g, "_").toUpperCase();
    // @ts-ignore
    return (!returnZoneString ? EorzeaWeather[zone as ObjectKey] as string || null : zone);
};

const zones = (() => {
    // nothing
    return Object.getOwnPropertyNames(EorzeaWeather).filter(e => e.startsWith("ZONE_"));
})();
const zoneNames = (() => {
    return zones.map(e => convertZoneToString(e)).sort((a, b) => a.localeCompare(b));
})();

const config: CommandConfig = {
    name: "eorzeaweather",
    aliases: ["ezw", "ffw", "ezweather", "ffweather"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Shows the current and future weather in a FFXIV Zone.",
    expectedArgs: "<zone>",
    options: [
        {
            name: "zone",
            description: "Zone to get current weather for.",
            type: Discord.ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
        },
    ],
    category: "FFXIV (/ffxiv)",
    guildOnly: true,
    deferReply: false,
};

export default {
    ...config,
    autocomplete: () => {
        return zoneNames;
    },
    callback: async ({ client, message, channel, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        if (args.length <= 0) {
            let zoneText = "";

            for (let i = 0; i < zoneNames.length; i++) {
                zoneText += `• ${(zoneNames[i])}\n`;
            }

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle("Available Zones")
                        .setDescription(zoneText),
                ],
            });
        }

        const search = args.join(" ").trim().toUpperCase();

        if (!zoneNames.map(e => e.toUpperCase()).includes(search)) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Invalid zone provided! See \`${settings.prefix}eorzeaweather\` for a list of all possible zones.`);
        }

        const curDate = DateTime.now().setZone(settings.timezone || "Europe/Berlin");
        const zone = convertStringToZone(search);
        
        if (!zone) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Invalid zone provided! See \`${settings.prefix}eorzeaweather\` for a list of all possible zones.`);
        }

        try {
            // @ts-ignore
            const weather = [{ weather: EorzeaWeather.getWeather(zone, curDate.toJSDate()), date: curDate }];

            for (let i = 0; i < 12600; i += 5) {
                if (weather.length > 5) {
                    break;
                }

                const t = curDate.setZone(settings.timezone || "Europe/Berlin").plus({ seconds: i });
                const w = {
                    // @ts-ignore
                    weather: EorzeaWeather.getWeather(zone, t.toJSDate()),
                    date: t,
                };

                if (w.weather != weather[weather.length - 1].weather) {
                    weather.push(w);
                }
            }

            let weatherText = "";
            let whenText = "";
            let untilText = "";
            for (let i = 1; i < weather.length; i++) {
                const ms = weather[i].date.diff(DateTime.now());

                whenText += `\`${settings.time_format_24h ? weather[i].date.toFormat("HH:mm") : weather[i].date.toLocaleString(DateTime.TIME_SIMPLE)}\`\n`;
                weatherText += `${getEmojiForWeather(weather[i].weather)} ${weather[i].weather}\n`;
                untilText += `\`${ms.toFormat("hh:mm:ss").replace("-", "")}\`\n`;
            }

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({ name: `Current weather in ${convertZoneToString(convertStringToZone(search, true))}`, iconURL: client.bahamut.config.game_icons.ffxiv })
                        .setDescription(`${getEmojiForWeather(weather[0].weather)} ${weather[0].weather}`)
                        .setFields(
                            { name: "Forecast", value: weatherText, inline: true },
                            { name: "Time until", value: untilText, inline: true },
                            { name: "Local time", value: whenText, inline: true }
                        ),
                ],
            });
        } catch (e) {
            console.error("Error calculating weather forecast:", e);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error calculating weather forecast, please try again later.");
        }
    },
};

const getEmojiForWeather = (weather: string) => {
    switch (weather.toLowerCase()) {
        case "astromagnetic storm":
            return emoji.get("cloud_tornado");
        case "blizzards":
            return emoji.get("cloud_snow");
        case "clear skies":
            return emoji.get("partly_sunny");
        case "clouds":
            return emoji.get("cloud");
        case "dust storms":
            return emoji.get("cloud_tornado");
        case "fair skies":
            return emoji.get("sun_behind_large_cloud");
        case "fog":
            return emoji.get("fog");
        case "gales":
            return emoji.get("dash");
        case "gloom":
            return emoji.get("sun_behind_large_cloud");
        case "heat waves":
            return emoji.get("sunny");
        case "moon dust":
            return emoji.get("dash");
        case "rain":
            return emoji.get("cloud_with_rain");
        case "showers":
            return emoji.get("cloud_with_rain");
        case "snow":
            return emoji.get("cloud_snow");
        case "thunder":
            return emoji.get("thunder_cloud_rain");
        case "thunderstorms":
            return emoji.get("thunder_cloud_rain");
        case "umbral static":
            return emoji.get("sun_behind_large_cloud");
        case "umbral wind":
            return emoji.get("dash");
        case "wind":
            return emoji.get("dash");
        default:
            return "";
    }
};