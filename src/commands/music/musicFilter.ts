import * as emoji from "node-emoji";
import { CommandType } from "wokcommands";
import { toProperCase } from "../../lib/toolFunctions.js";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import {
    handleErrorResponseToMessage,
    handleResponseToMessage,
    handleSuccessResponseToMessage,
} from "../../lib/messageHandlers.js";
import { CommandConfig } from "../../../typings.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import { readFileSync } from 'fs';
import { resolve } from "path";

const config: CommandConfig = {
    name: "filter",
    aliases: ["fil", "flt"],
    type: CommandType.LEGACY,
    description: "Toggle a filter to apply to the music playback. Use \"list\" for a list of all available filters.",
    expectedArgs: "[list or name] [% strength]",
    options: [
        {
            name: "name",
            description: "Set audio filter.",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
            choices: (() => {
                const choices = [];
                const filters = JSON.parse(
                    readFileSync(resolve("assets/music_filters.json"), "utf-8")
                );
                for (const [name] of Object.entries(filters).sort(([a1], [a2]) => a1.localeCompare(a2))) {
                    choices.push({ name: toProperCase(name), value: name });
                }
                return choices;
            })(),
        },
        {
            name: "intensity",
            description: "Set filter intensity in % (this does not work for every filter).",
            type: Discord.ApplicationCommandOptionType.Integer,
            required: false,
            minValue: 1,
            maxValue: 100,
        },
    ],
    minArgs: 0,
    category: "Music",
    deferReply: true,
    testOnly: false,
    guildOnly: true,
};

export default {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         args,
                         member,
                         interaction,
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        // Run command pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, args, member, interaction }, config, [
            { type: PreCheckType.GUILD_IS_PREMIUM, customErrorMessage: `Using music filters requires an active premium subscription.\nIf you want to know more about this, please check out our [website](${client.bahamut.config.website_link}).` },
            { type: PreCheckType.USER_IS_DJ },
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]);
        if (await checks.runChecks()) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it before changing filters.");

        const filters = client.bahamut.musicHandler.filters;
        let filterText = "";

        // eslint-disable-next-line no-unused-vars
        for (const [name] of Object.entries(filters).sort(([a1], [a2]) => a1.localeCompare(a2))) {
            filterText += `• ${toProperCase(name)} \n`;
        }

        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            textChannel: channel.id,
        });

        const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_IS_PLAYING, player: player },
        ]);

        if (args.length <= 0) {
            if (message) await message.reactions.removeAll();

            if (!player || !player.get("music_filter")) {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("control_knobs")} There is currently no filter applied!`);
            } else {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("control_knobs")} The filter \`${toProperCase(player.get("music_filter"))}\` is currently applied!`);
            }
        } else if (args.length > 0) {
            if (args[0].toLowerCase() === "list") {
                if (message) await message.reactions.removeAll();

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setTitle("Possible Filters")
                            .setDescription(filterText)
                            .setFooter({ text: "Note: Filters that speed up playback can cause issues with webstreams (e.g. nightcore)!" }),
                    ],
                });
            }
            if ((Object.keys(filters).includes(args[0].toLowerCase())) || args[0].toLowerCase() === "off") {
                if (await musicPlayingCheck.runChecks()) return;
                if (!player.queue.current) return handleResponseToMessage(client, message || interaction, false, config.deferReply, "There are no songs in the queue to apply a filter!");

                if (["off", "reset"].includes(args[0].toLowerCase())) {
                    const obj = {
                        op: "filters",
                        guildId: channel.guild.id,
                    };

                    await player.node.send(obj);
                    player.set("music_filter", null);
                } else if (args[0].toLowerCase() === "bassboost") {
                    const obj = {
                        op: "filters",
                        guildId: channel.guild.id,
                        equalizer: [],
                    };
                    let boostPercent;

                    if (args.length > 1 && parseInt(args[1])) {
                        boostPercent = parseInt(args[1]);
                    } else {
                        boostPercent = (0.22 * 100);
                    }

                    // @ts-ignore
                    obj.equalizer = [...Array(6).fill(boostPercent / 100).map((x: number, i: number) => ({ band: i, gain: x }))];

                    await player.node.send(obj);
                    player.set("music_filter", "bassboost");

                    if (message) await message.reactions.removeAll();

                    return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("ballot_box_with_check")} Current queue filter set to \`Bassboost\` with \`${Math.floor(boostPercent)}%\` boost!`);
                } else {
                    const obj = {
                        op: "filters",
                        guildId: channel.guild.id,
                        // @ts-ignore
                        ...filters[args[0].toLowerCase()],
                    };

                    await player.node.send(obj);
                    player.set("music_filter", args[0].toLowerCase());
                }

                return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("ballot_box_with_check")} Current queue filter has been set to \`${args[0] ? toProperCase(args[0]) : "Off"}\`!`);
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Invalid filter!");
            }
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Unknown error while applying filter!");
        }
    },
};
