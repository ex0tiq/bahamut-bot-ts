import * as emoji from "node-emoji";
import { CommandConfig } from "../../../typings.js";
import { formatDuration } from "../../lib/durationFunctions.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "queue",
    aliases: ["q"],
    type: CommandType.LEGACY,
    description: "Show the current music queue.",
    minArgs: 0,
    expectedArgs: "[option] [pos 1] [pos 2]",
    options: [
        {
            name: "page-or-action",
            description: "Page of queue or queue action (see /help for all possible actions).",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: "position-1",
            description: "First position.",
            type: Discord.ApplicationCommandOptionType.Integer,
            required: false,
        },
        {
            name: "position-2",
            description: "Second position.",
            type: Discord.ApplicationCommandOptionType.Integer,
            required: false,
        },
    ],
    category: "Music",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         member,
                         args,
                         interaction,
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        const checks = new BahamutCommandPreChecker(client, {
            client,
            message,
            channel,
            args,
            member,
            interaction,
        }, config, [
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]), djCheck = new BahamutCommandPreChecker(client, {
            client,
            message,
            channel,
            args,
            member,
            interaction,
        }, config, [
            { type: PreCheckType.USER_IS_DJ },
        ]);
        if (await checks.runChecks()) return;

        const player = client.bahamut.musicHandler.getPlayer(channel.guild.id);

        const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_IS_AVAILABLE, player: player },
        ]);
        if (await musicPlayingCheck.runChecks()) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it.");

        let max_page = 1;
        if (player!.kazaPlayer.queue.length > 11) max_page = Math.ceil((player!.kazaPlayer.queue.length - 1) / 10);

        if (args.length === 0 || (args.length === 1 && parseInt(args[0]))) {
            let page = 1;

            if (args.length > 0) {
                try {
                    page = parseInt(args[0]);
                } catch(e) {
                    page = 1;
                }
            }

            if (page > max_page) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `The current queue only has \`${max_page}\` pages!`);

            const from = ((page === 1) ? 0 : ((page * 10) - 10));
            const to = (page * 10);
            let queueString = "";
            for(let i = from; i < ((page != max_page) ? to : player!.kazaPlayer.queue.size); i++) {
                queueString += `\`${i + 1}\` [${!["youtube","soundcloud"].includes(player!.kazaPlayer.queue[i].sourceName) ? `${player!.kazaPlayer.queue[i].author} - ` : ""}${player!.kazaPlayer.queue[i].title}](${player!.kazaPlayer.queue[i].realUri || player!.kazaPlayer.queue[i].uri}) \`[${formatDuration(player!.kazaPlayer.queue[i].length!)}]\` ${player!.kazaPlayer.queue[i].requester}${player!.kazaPlayer.queue[i].isStream ? ` ${emoji.get("radio")}` : ` ${emoji.get("musical_note")}`}\n`;
            }

            let embed = new Discord.EmbedBuilder()
                .setTitle(`${emoji.get("page_facing_up")}  Music Queue`)
                .setDescription(`**Now Playing**\n${player!.kazaPlayer.queue.current!.isStream ? `${emoji.get("radio")} ` : `${emoji.get("musical_note")} `}[${!["youtube","soundcloud"].includes(player!.kazaPlayer.queue.current!.sourceName)? `${player!.kazaPlayer.queue.current!.author} - ` : ""}${player!.kazaPlayer.queue.current!.title}](${player!.kazaPlayer.queue.current!.realUri || player!.kazaPlayer.queue.current!.uri})\n\n**Up Next**\n${player!.kazaPlayer.queue.size >= 1 ? queueString : "Nothing"}`)
                .setFields(
                    { name: "Entries left", value: "" + player!.kazaPlayer.queue.size, inline: true },
                    { name: "Total Duration", value: (player!.kazaPlayer.queue.current!.isStream ? "∞" : formatDuration(player!.kazaPlayer.queue.durationLength + (player!.kazaPlayer.queue.current ? player!.kazaPlayer.queue.current.length! : 0))), inline: true },
                    { name: "\u200B", value: "\u200B", inline: true }
                )
                .setFooter({ text: `Page ${page}/${max_page}` });

            // Add status fields
            embed = await client.bahamut.musicHandler.musicStatus(player!, embed);

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, { embeds: [embed] });
        } else if (args.length === 1) {
            if (["clear", "cls", "delall", "remall", "rma"].includes(args[0].toLowerCase())) {
                if (await djCheck.runChecks()) return;

                const size = player!.kazaPlayer.queue.size;

                player!.kazaPlayer.queue.clear();

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setTitle(`${emoji.get("page_facing_up")}  Music Queue`)
                            .setDescription(`${emoji.get("white_check_mark")} Successfully cleared \`${size}\` entries from the queue!`),
                    ],
                });
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }
        } else if (args.length === 2) {
            if (["remove", "delete", "rm", "rmv", "del"].includes(args[0].toLowerCase())) {
                if (await djCheck.runChecks()) return;

                if (!parseInt(args[1])) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Second parameter must be a number between \`1\` and \`${player!.kazaPlayer.queue.size}\`!`);
                if ((player!.kazaPlayer.queue.size) < (parseInt(args[1]) - 1) || (parseInt(args[1]) - 1) < 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Second parameter must be a number between \`1\` and \`${player!.kazaPlayer.queue.size}\`!`);

                try {
                    player!.kazaPlayer.queue.remove(parseInt(args[1]) - 1);

                    return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setTitle(`${emoji.get("page_facing_up")}  Music Queue`)
                                .setDescription(`${emoji.get("white_check_mark")} Successfully removed queue item at position \`${args[1]}\`!\n${emoji.get("arrow_right")} \`${player!.kazaPlayer.queue.size}\` entries remaining!`),
                        ],
                    });
                } catch (e) {
                    console.error("Error while removing queue item:", e);
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Error removing queue item at position \`${args[1]}\`!`);
                }
            } else if (["jump", "goto"].includes(args[0].toLowerCase())) {
                if (await djCheck.runChecks()) return;

                let id;
                try {
                    id = parseInt(args[1]);
                } catch (e) {
                    id = -1;
                }

                if (id > 0) {
                    if (player!.kazaPlayer.queue.size < id || id > player!.kazaPlayer.queue.size) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Second parameter must be a number between \`1\` and \`${player!.kazaPlayer.queue.size}\`!`);

                    for (let i = 0; i < (id - 1); i++) {
                        player!.kazaPlayer.queue.remove(0);
                    }

                    player!.destroy();

                    return handleResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("twisted_rightwards_arrows")} Jumped to song number \`${id}\` in the queue!`);
                } else {
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Invalid id provided, please check the queue for all available songs!");
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }
        } else if (args.length === 3) {
            if (["move", "mv"].includes(args[0].toLowerCase())) {
                if (await djCheck.runChecks()) return;
                if (!parseInt(args[1]) || !parseInt(args[2])) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Second and third parameter must be numbers between \`1\` and \`${player!.kazaPlayer.queue.size}\` and can't be the same!`);
                if ((((player!.kazaPlayer.queue.size) < (parseInt(args[1]) - 1) || (parseInt(args[1]) - 1) < 0) || ((player!.kazaPlayer.queue.size) < (parseInt(args[2]) - 1) || (parseInt(args[2]) - 1) < 0)) || ((parseInt(args[2]) - 1) === (parseInt(args[1]) - 1))) {return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Second and third parameter must be numbers between \`1\` and \`${player!.kazaPlayer.queue.size}\` and can't be the same!`);}

                try {
                    const track = player!.kazaPlayer.queue[parseInt(args[1]) - 1];

                    player!.kazaPlayer.queue.remove(parseInt(args[1]) - 1);
                    player!.kazaPlayer.queue.splice(parseInt(args[2]) - 1, 0, track);

                    return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setTitle(`${emoji.get("page_facing_up")}  Music Queue`)
                                .setDescription(`${emoji.get("white_check_mark")} Successfully moved queue item \`${args[1]}\` to position \`${args[2]}\`!`),
                        ],
                    });
                } catch (e) {
                    console.error("Error swapping queue items:", e);
                    return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Error swapping items at positions \`${args[1]}\` and \`${args[2]}\`!`);
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }
        }
    },
};