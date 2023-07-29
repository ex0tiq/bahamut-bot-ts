import { CommandConfig } from "../../../typings.js";
import { isInt } from "../../lib/validateFunctions.js";
import { formatDuration } from "../../lib/durationFunctions.js";
import Discord from "discord.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import {
    createErrorResponse, createSuccessResponse,
    handleErrorResponseToMessage, handleResponseToChannel,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";
import { KazagumoSearchResult, PlayerState } from "kazagumo";

const config: CommandConfig = {
    name: "search",
    aliases: ["musicsearch", "ms"],
    type: CommandType.LEGACY,
    description: "Search for a song.",
    expectedArgs: "<search-term>",
    options: [
        {
            name: "search-term",
            description: "Search for video.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    minArgs: 1,
    category: "Music",
    guildOnly: true,
    deferReply: "ephemeral",
    testOnly: false,
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
        const settings = await getGuildSettings(client, channel.guild),
            search = args.join(" ");
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
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            {
                type: PreCheckType.BOT_HAS_PERMISSIONS, requiredPermissions: [
                    { bitField: Discord.PermissionFlagsBits.Connect, name: "CONNECT" },
                    { bitField: Discord.PermissionFlagsBits.Speak, name: "SPEAK" },
                ],
            },
            { type: PreCheckType.ALL_PARAMS_PROVIDED, paramsCheck: !!(search) },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]);
        if (await checks.runChecks()) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it before playing music.");

        let res: KazagumoSearchResult,
            selectedId,
            queueString = "";

        const filterMessage = (selectInteraction: any) => selectInteraction.customId === "musicSearchSelect" && selectInteraction.user.id === member.id;

        try {
            try {
                // Search for tracks using a url, using a query searches youtube automatically and the track requester object
                res = await client.bahamut.musicHandler.manager.search(search, { requester: member });

                // Check the load type as this command is not that advanced for basics
                if (!res) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
                else if (res.tracks.length <= 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This search did not return any results! Please try again!");
            } catch (err) {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
            }

            for (let i = 1; i <= ((res.tracks.length > 10) ? 10 : res.tracks.length); i++) {
                queueString += `\`${i}\` [${res.tracks[i - 1].title}](${res.tracks[i - 1].realUri || res.tracks[i - 1].uri}) \`[${formatDuration(res.tracks[i - 1].length!)}]\`\n`;
            }

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId("musicSearchSelect")
                        .setPlaceholder("Nothing selected...")
                        .addOptions([{ label: "Cancel", value: "cancel" }].concat([...Array(res.tracks.length > 10 ? 10 : res.tracks.length).keys()].map(e => {
                                return {
                                    label: res.tracks[e].title,
                                    value: "" + e,
                                };
                            }))
                        ),
                );

            const msg = await handleResponseToMessage(client, message || interaction, false, "ephemeral", {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle("Search Results")
                        .setDescription(`${queueString}`),
                ],
                components: [row],
            });

            // @ts-ignore
            msg.awaitMessageComponent({ filter: filterMessage, time: 30000 }).then(async (collected: Discord.MessageComponentInteraction) => {
                // @ts-ignore
                selectedId = collected.values[0];

                if (selectedId.toLowerCase() === "cancel") {
                    return collected.update({
                        ...createErrorResponse(client, "Search aborted by user."),
                        components: [],
                    });
                }

                if (!isInt(selectedId)) {
                    return collected.update({
                        ...createErrorResponse(client, "Invalid id entered, search aborted, please look above for the possible values."),
                        components: [],
                    });
                }

                selectedId = parseInt(selectedId);

                if (selectedId > res.tracks.length || selectedId < 0) {
                    return collected.update({
                        ...createErrorResponse(client, "Invalid id entered, search aborted, please look above for the possible values."),
                        components: [],
                    });
                }

                const player = await client.bahamut.musicHandler.createPlayer(channel.guild.id, member.voice.channelId!, channel.id);

                if (!player.kazaPlayer.voiceId) player.kazaPlayer.setVoiceChannel(member.voice.channelId!.toString());

                // Connect to the voice channel and add the track to the queue
                if (player.kazaPlayer.state !== PlayerState.CONNECTED && player.kazaPlayer.state !== PlayerState.CONNECTING) player.kazaPlayer.connect();

                player.kazaPlayer.queue.add(res.tracks[selectedId]);

                if (player.kazaPlayer.queue.length > 0) {
                    await handleResponseToChannel(client, channel, (await client.bahamut.musicHandler.getTrackAddEmbed(player.kazaPlayer, res.tracks[selectedId]!, member))!);
                } else {
                    player.setSkipTrackStart(true);
                    await handleResponseToChannel(client, channel, (await client.bahamut.musicHandler.getTrackStartEmbed(player, res.tracks[selectedId]!, member))!);
                }

                await collected.update({
                    ...createSuccessResponse(client, "Selected result has been added to the queue."),
                    components: [],
                });

                if (player.kazaPlayer.playing && player.kazaPlayer.queue.current!.isStream) {
                    await player.destroy();
                }
                if (!player.kazaPlayer.playing && !player.kazaPlayer.paused && !player.kazaPlayer.queue.size) await player.kazaPlayer.play();
            }).catch(() => {
                return handleErrorResponseToMessage(client, msg!, true, "ephemeral", {
                    ...createErrorResponse(client, "Timeout of 30 seconds exceeded, search aborted."),
                    components: [],
                });
            });
        } catch (e) {
            console.error("Error while searching for music:", e);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while searching for music. Please try again later.");
        }
    },
};