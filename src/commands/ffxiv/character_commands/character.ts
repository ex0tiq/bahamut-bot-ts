import Discord from "discord.js";
import { CommandConfig } from "../../../../typings.js";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../../modules/BahamutClient.js";
import lang from "../../../lib/languageMessageHandlers.js";
import fs from "fs";
import { resolve } from "path";
import { getGuildSettings } from "../../../lib/getFunctions.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../../lib/messageHandlers.js";
import { toProperCase } from "../../../lib/toolFunctions.js";
// @ts-ignore
import XIVAPI from "@xivapi/js";

const allServers: string[] = (() => {
    const path = resolve("cache/ffxiv_servers.json");
    if (fs.existsSync(path)) {
        return JSON.parse(
            fs.readFileSync(path, "utf-8")
        );
    } else {
        return[];
    }
})();

const config: CommandConfig = {
    name: "character",
    type: CommandType.LEGACY,
    description: "Search for an ffxiv character on a server.",
    minArgs: 2,
    expectedArgs: "<server> <character>",
    options: [
        {
            name: "server",
            description: "The FFXIV server you are playing on.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
        {
            name: "character-name",
            description: "The character you want to search for.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    category: "FFXIV",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    autocomplete: () => {
        return allServers;
    },
    callback: async ({ client, message, channel, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        if ((message && args.length < 3) || (!message && args.length < 2)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));

        const xiv = new XIVAPI({
            private_key: client.bahamut.config.xivapi_token,
            language: settings.language,
        }), jobEmojiList = client.bahamut.config.job_emoji_list;
        let servers = [], response = null, totalMinions = [], totalMounts = [];

        try {
            servers = allServers.map((e) => {
                return e.toLowerCase();
            });
        } catch (err) {
            console.error("Error reading available FFXIV servers:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_generic") || "");
        }

        if (!servers.includes(args[0].toLowerCase())) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Invalid server provided. Please check server name and try again!");
        }

        try {
            response = await xiv.character.search(`${args.slice(1).join(" ")}`, {
                server: args[0],
            });
        } catch (err) {
            console.error("Error querying FFXIV character data:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_generic") || "");
        }
        if (response.Error) {
            console.error("Error querying FFXIV character data:", response.message);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_generic") || "");
        }

        if (response.Results.length >= 1) {
            const ffCharId = response.Results[0].ID;

            try {
                totalMinions = await xiv.data.list("Companion", {
                    limit: 3000,
                });
                totalMinions = totalMinions.Results;
                totalMounts = await xiv.data.list("Mount", {
                    limit: 3000,
                });
                totalMounts = totalMounts.Results;
                response = await xiv.character.get(ffCharId, {
                    extended: true,
                    data: "MIMO",
                });
            } catch (err) {
                console.error("Error fetching FFXIV character data:", err);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
            }

            if (response) {
                if (response.Error) {
                    console.error("Error fetching FFXIV character data:", response.Message);
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
                }

                try {
                    const msg = new Discord.EmbedBuilder()
                        .setAuthor({ name: response.Character.Name, iconURL: client.bahamut.config.game_icons.ffxiv })
                        .setThumbnail(response.Character.Avatar)
                        .setURL(`https://na.finalfantasyxiv.com/lodestone/character/${response.Character.ID}/`)
                        .setDescription(`Character on \`${response.Character.Server} (${response.Character.DC})\`.`);

                    if (response.Character.Title && response.Character.Title.Name) {
                        msg.addFields({ name: "Title", value: response.Character.Title.Name, inline: true });
                    } else {
                        msg.addFields({ name: "Title", value: "-", inline: true });
                    }
                    if ((response.Character.Race && response.Character.Race.Name) && (response.Character.Tribe && response.Character.Tribe.Name)) {
                        msg.addFields({ name: "Race and Tribe", value: `${response.Character.Race.Name}, ${response.Character.Tribe.Name}`, inline: true });
                    } else {
                        msg.addFields({ name: "Race and Tribe", value: "-", inline: true });
                    }
                    if (response.Character.GuardianDeity && response.Character.GuardianDeity.Name) {
                        msg.addFields({ name: "Guardian Deity", value: response.Character.GuardianDeity.Name, inline: true });
                    } else {
                        msg.addFields({ name: "Guardian Deity", value: "-", inline: true });
                    }
                    if (response.Character.FreeCompanyName || (response.Character.GrandCompany && response.Character.GrandCompany.Company && response.Character.GrandCompany.Company.Name)) {
                        if (response.Character.FreeCompanyName) {
                            msg.addFields({ name: "Free Company", value: response.Character.FreeCompanyName, inline: true });
                        } else {
                            msg.addFields({ name: "Free Company", value: "-", inline: true });
                        }
                        if (response.Character.GrandCompany && response.Character.GrandCompany.Company && response.Character.GrandCompany.Company.Name) {
                            msg.addFields({ name: "Grand Company", value: response.Character.GrandCompany.Company.Name, inline: true });
                        } else {
                            msg.addFields({ name: "Grand Company", value: "-", inline: true });
                        }
                        msg.addFields({ name: "\u200B", value: "\u200B", inline: true });
                    }

                    if (response.Mounts && response.Mounts.length > 0 && totalMounts && totalMounts.length > 0) {
                        msg.addFields({ name: "Mounts", value: `${response.Mounts.length}/${totalMounts.length} (**${Math.round((response.Mounts.length * 100) / totalMounts.length)}%**)`, inline: true });
                    } else {
                        msg.addFields({ name: "Mounts", value: `0/${totalMounts.length} (**0%**)`, inline: true });
                    }
                    if (response.Minions && response.Minions.length > 0 && totalMinions && totalMinions.length > 0) {
                        msg.addFields({ name: "Minions", value: `${response.Minions.length}/${totalMinions.length} (**${Math.round((response.Minions.length * 100) / totalMinions.length)}%**)`, inline: true });
                    } else {
                        msg.addFields({ name: "Minions", value: `0/${totalMinions.length} (**0%**)`, inline: true });
                    }
                    msg.addFields({ name: "\u200B", value: "\u200B", inline: true });

                    if (response.Character.ClassJobs && response.Character.ClassJobs.length > 0) {
                        const jobs: { [key: string]: any } = {};
                        let tankText = "", healText = "", dpsText = "", dshText = "", dslText = "";
                        for (const job of response.Character.ClassJobs) {
                            jobs[job.Class.ID] = job;
                        }

                        if (typeof jobs[1] !== "undefined") {
                            tankText += `<:pld:${jobEmojiList.jobs.pld}> ${jobs[1].UnlockedState.Name}: **${jobs[1].Level}**\n`;
                        }
                        if (typeof jobs[3] !== "undefined") {
                            tankText += `<:war:${jobEmojiList.jobs.war}> ${jobs[3].UnlockedState.Name}: **${jobs[3].Level}**\n`;
                        }
                        if (typeof jobs[32] !== "undefined") {
                            tankText += `<:drk:${jobEmojiList.jobs.drk}> ${jobs[32].UnlockedState.Name}: **${jobs[32].Level}**\n`;
                        }
                        if (typeof jobs[37] !== "undefined") {
                            tankText += `<:gnb:${jobEmojiList.jobs.gnb}> ${jobs[37].UnlockedState.Name}: **${jobs[37].Level}**\n`;
                        }

                        if (typeof jobs[6] !== "undefined") {
                            healText += `<:whm:${jobEmojiList.jobs.whm}> ${jobs[6].UnlockedState.Name}: **${jobs[6].Level}**\n`;
                        }
                        if (typeof jobs[26] !== "undefined") {
                            healText += `<:sch:${jobEmojiList.jobs.sch}> ${jobs[26].UnlockedState.Name}: **${jobs[26].Level}**\n`;
                        }
                        if (typeof jobs[33] !== "undefined") {
                            healText += `<:ast:${jobEmojiList.jobs.ast}> ${jobs[33].UnlockedState.Name}: **${jobs[33].Level}**\n`;
                        }
                        if (typeof jobs[40] !== "undefined") {
                            healText += `<:sge:${jobEmojiList.jobs.sge}> ${jobs[40].UnlockedState.Name}: **${jobs[40].Level}**\n`;
                        }

                        if (typeof jobs[2] !== "undefined") {
                            dpsText += `<:mnk:${jobEmojiList.jobs.mnk}> ${jobs[2].UnlockedState.Name}: **${jobs[2].Level}**\n`;
                        }
                        if (typeof jobs[4] !== "undefined") {
                            dpsText += `<:drg:${jobEmojiList.jobs.drg}> ${jobs[4].UnlockedState.Name}: **${jobs[4].Level}**\n`;
                        }
                        if (typeof jobs[29] !== "undefined") {
                            dpsText += `<:nin:${jobEmojiList.jobs.nin}> ${jobs[29].UnlockedState.Name}: **${jobs[29].Level}**\n`;
                        }
                        if (typeof jobs[34] !== "undefined") {
                            dpsText += `<:sam:${jobEmojiList.jobs.sam}> ${jobs[34].UnlockedState.Name}: **${jobs[34].Level}**\n`;
                        }
                        if (typeof jobs[39] !== "undefined") {
                            dpsText += `<:rpr:${jobEmojiList.jobs.rpr}> ${jobs[39].UnlockedState.Name}: **${jobs[39].Level}**\n`;
                        }
                        if (typeof jobs[5] !== "undefined") {
                            dpsText += `<:brd:${jobEmojiList.jobs.brd}> ${jobs[5].UnlockedState.Name}: **${jobs[5].Level}**\n`;
                        }
                        if (typeof jobs[31] !== "undefined") {
                            dpsText += `<:mch:${jobEmojiList.jobs.mch}> ${jobs[31].UnlockedState.Name}: **${jobs[31].Level}**\n`;
                        }
                        if (typeof jobs[38] !== "undefined") {
                            dpsText += `<:dnc:${jobEmojiList.jobs.dnc}> ${jobs[38].UnlockedState.Name}: **${jobs[38].Level}**\n`;
                        }
                        if (typeof jobs[7] !== "undefined") {
                            dpsText += `<:blm:${jobEmojiList.jobs.blm}> ${jobs[7].UnlockedState.Name}: **${jobs[7].Level}**\n`;
                        }
                        if (typeof jobs[26] !== "undefined") {
                            dpsText += `<:smn:${jobEmojiList.jobs.smn}> ${jobs[26].UnlockedState.Name}: **${jobs[26].Level}**\n`;
                        }
                        if (typeof jobs[35] !== "undefined") {
                            dpsText += `<:rdm:${jobEmojiList.jobs.rdm}> ${jobs[35].UnlockedState.Name}: **${jobs[35].Level}**\n`;
                        }
                        if (typeof jobs[36] !== "undefined") {
                            dpsText += `<:blu:${jobEmojiList.jobs.blu}> ${jobs[36].UnlockedState.Name.split("(")[0].trim()}: **${jobs[36].Level}**\n`;
                        }

                        if (typeof jobs[8] !== "undefined") {
                            dshText += `<:crp:${jobEmojiList.dsh.crp}> ${jobs[8].UnlockedState.Name}: **${jobs[8].Level}**\n`;
                        }
                        if (typeof jobs[9] !== "undefined") {
                            dshText += `<:bsm:${jobEmojiList.dsh.bsm}> ${jobs[9].UnlockedState.Name}: **${jobs[9].Level}**\n`;
                        }
                        if (typeof jobs[10] !== "undefined") {
                            dshText += `<:arm:${jobEmojiList.dsh.arm}> ${jobs[10].UnlockedState.Name}: **${jobs[10].Level}**\n`;
                        }
                        if (typeof jobs[11] !== "undefined") {
                            dshText += `<:gsm:${jobEmojiList.dsh.gsm}> ${jobs[11].UnlockedState.Name}: **${jobs[11].Level}**\n`;
                        }
                        if (typeof jobs[12] !== "undefined") {
                            dshText += `<:ltw:${jobEmojiList.dsh.ltw}> ${jobs[12].UnlockedState.Name}: **${jobs[12].Level}**\n`;
                        }
                        if (typeof jobs[13] !== "undefined") {
                            dshText += `<:wvr:${jobEmojiList.dsh.wvr}> ${jobs[13].UnlockedState.Name}: **${jobs[13].Level}**\n`;
                        }
                        if (typeof jobs[14] !== "undefined") {
                            dshText += `<:alc:${jobEmojiList.dsh.alc}> ${jobs[14].UnlockedState.Name}: **${jobs[14].Level}**\n`;
                        }
                        if (typeof jobs[15] !== "undefined") {
                            dshText += `<:cul:${jobEmojiList.dsh.cul}> ${jobs[15].UnlockedState.Name}: **${jobs[15].Level}**\n`;
                        }

                        if (typeof jobs[16] !== "undefined") {
                            dslText += `<:min:${jobEmojiList.dsl.min}> ${jobs[16].UnlockedState.Name}: **${jobs[16].Level}**\n`;
                        }
                        if (typeof jobs[17] !== "undefined") {
                            dslText += `<:btn:${jobEmojiList.dsl.btn}> ${jobs[17].UnlockedState.Name}: **${jobs[17].Level}**\n`;
                        }
                        if (typeof jobs[18] !== "undefined") {
                            dslText += `<:fsh:${jobEmojiList.dsl.fsh}> ${jobs[18].UnlockedState.Name}: **${jobs[18].Level}**\n`;
                        }

                        if (tankText !== "" || healText !== "" || dpsText !== "") {
                            msg.addFields({ name: "Disciples of War", value: `
							${((tankText !== "" ? `${tankText.replace(/\n$/, "")}\n` : ""))}
							${((healText !== "" ? `${healText.replace(/\n$/, "")}\n` : ""))}
							${((dpsText !== "" ? `${dpsText.replace(/\n$/, "")}` : ""))}`, inline: true });
                        }
                        if (dslText !== "" || dshText !== "") {
                            msg.addFields({ name: "Disciples of the Land/Hand", value: `${((dslText !== "" ? `${dslText.replace(/\n$/, "")}\n\n` : ""))}${((dshText !== "" ? `${dshText.replace(/\n$/, "")}\n\n` : ""))}`, inline: true });
                        }
                    }

                    return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                        embeds: [msg],
                    });
                } catch (err) {
                    console.error("Error while querying FFXIV character data:", err);
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while querying character data. Please try again later.");
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "No character data found. Please try again later.");
            }
        }
        return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `No characters found for \`${args.slice(1).join(" ")}\` on server \`${toProperCase(args[0])}\`.`);
    },
};