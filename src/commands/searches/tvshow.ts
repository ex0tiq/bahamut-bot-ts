import { isInt } from "../../lib/validateFunctions";
// @ts-ignore
import { Tmdb } from "tmdb";
import { CommandConfig } from "../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import { DateTime } from "luxon";
import {
    createErrorResponse, createMissingParamsErrorResponse, createSuccessResponse,
    handleErrorResponseToMessage,
    handleResponseToChannel,
    handleResponseToMessage,
} from "../../lib/messageHandlers";
import { toProperCase } from "../../lib/toolFunctions";

const config: CommandConfig = {
    name: "tvshow",
    aliases: ["tv"],
    type: CommandType.LEGACY,
    description: "Search for a tv show on themoviedb.org.",
    expectedArgs: "<search term>",
    options: [
        {
            name: "search-term",
            description: "Search term.",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    minArgs: 1,
    category: "Searches",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: false,
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
        if (settings.disabled_categories.includes("searches")) return;

        const tmdb = new Tmdb(client.bahamut.config.tmdb_token);

        try {
            if (args.length > 0) {
                let queueString = "";
                const results = await tmdb.get("search/tv", {
                    query: args.join(" "),
                }),
                    api_config = await tmdb.get("configuration", {});

                if (results.results.length == 1) {
                    try {
                        const tvshowResult = await tmdb.get(`tv/${results.results[0].id}`),
                            embed = new Discord.EmbedBuilder()
                                .setTitle(`${results.name} (${DateTime.fromFormat(results.firstAirDate, "yyyy-MM-dd").toFormat("yyyy")} - ${results.inProduction ? "" : DateTime.fromFormat(results.lastAirDate, "yyyy-MM-dd").toFormat("yyyy")})`)
                                .setDescription(results.overview.replace(/<br>/g, "\n").replace(/\n\n/g, "\n").replace(/(<([^>]+)>)/gi, ""))
                                .setURL(`https://www.themoviedb.org/tv/${results.id}`)
                                .setFooter({ text: "Powered by TMDb" });

                        if (tvshowResult.posterPath) {
                            embed.setThumbnail(`${api_config.images.secureBaseUrl}w500${tvshowResult.posterPath}`);
                        }
                        if (tvshowResult.originalName) {
                            embed.addFields({ name: "Original name", value: tvshowResult.originalName });
                        }

                        embed.addFields({ name: "Rating", value: `${Math.round((tvshowResult.voteAverage) * 10)}/100`, inline: true });
                        embed.addFields({ name: "Seasons", value: `${tvshowResult.numberOfSeasons}`, inline: true });
                        embed.addFields({ name: "Episodes", value: `${tvshowResult.numberOfEpisodes}`, inline: true });
                        embed.addFields({ name: "Status", value: toProperCase(tvshowResult.status) });
                        embed.addFields({ name: "Genres", value: tvshowResult.genres.map((elem: { name: any; }) => elem.name).join(", "), inline: true });

                        if (tvshowResult.posterPath) {
                            embed.setImage(`${api_config.images.secureBaseUrl}w780${tvshowResult.backdropPath}`);
                        }

                        // Make this reply deferred
                        if (interaction) {
                            await interaction.deferReply({
                                ephemeral: false,
                            });
                        }

                        return handleResponseToMessage(client, message || interaction, false, true, { embeds: [embed] });
                    } catch (ex) {
                        console.error("Error querying TMDb for anime:", ex);
                        return handleErrorResponseToMessage(client, message || interaction, false, true, "An error occured while fetching this tv show. Please try again later.");
                    }
                } else {
                    if (results.results.length <= 0) {
                        return handleErrorResponseToMessage(client, message || interaction, false, true, "No search results for this query.");
                    }

                    for (let i = 1; i <= ((results.results.length > 10) ? 10 : results.results.length); i++) {
                        queueString += `\`${i}\` [${results.results[i - 1].name}](https://www.themoviedb.org/tv/${results.results[i - 1].id}) `;

                        if (results.results[i - 1].firstAirDate && results.results[i - 1].lastAirDate) {
                            queueString += `(${DateTime.fromFormat(results.results[i - 1].firstAirDate, "yyyy-MM-dd").toFormat("yyyy")} - ${results.results[i - 1].inProduction ? "" : DateTime.fromFormat(results.results[i - 1].lastAirDate, "yyyy-MM-dd").toFormat("yyyy")})\n`;
                        } else if (results.results[i - 1].firstAirDate && !results.results[i - 1].lastAirDate) {
                            queueString += `(${DateTime.fromFormat(results.results[i - 1].firstAirDate, "yyyy-MM-dd").toFormat("yyyy")})\n`;
                        } else {
                            queueString += "\n";
                        }
                    }

                    const filterMessage = (selectInteraction: any) => selectInteraction.customId === "tvshowSearchSelect" && selectInteraction.user.id === member.id;

                    const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.SelectMenuBuilder()
                                .setCustomId("tvshowSearchSelect")
                                .setPlaceholder("Nothing selected...")
                                .addOptions([{ label: "Cancel", value: "cancel" }].concat([...Array(results.results.length > 10 ? 10 : results.results.length).keys()].map(e => {
                                        return {
                                            label: results.results[e].name,
                                            value: "" + e,
                                        };
                                    }))
                                ),
                        );

                    // Make this reply only visible for requesting user
                    if (interaction) {
                        await interaction.deferReply({
                            ephemeral: true,
                        });
                    }

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
                        let selectedId;

                        try {
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

                            if (selectedId > results.results.length || selectedId < 0) {
                                return collected.update({
                                    ...createErrorResponse(client, "Invalid id entered, search aborted, please look above for the possible values."),
                                    components: [],
                                });
                            }

                            const tvshowResult = await tmdb.get(`tv/${results.results[0].id}`),
                                embed = new Discord.EmbedBuilder()
                                    .setTitle(`${results.name} (${DateTime.fromFormat(results.firstAirDate, "yyyy-MM-dd").toFormat("yyyy")} - ${results.inProduction ? "" : DateTime.fromFormat(results.lastAirDate, "yyyy-MM-dd").toFormat("yyyy")})`)
                                    .setDescription(results.overview.replace(/<br>/g, "\n").replace(/\n\n/g, "\n").replace(/(<([^>]+)>)/gi, ""))
                                    .setURL(`https://www.themoviedb.org/tv/${results.id}`)
                                    .setFooter({ text: "Powered by TMDb" });

                            if (tvshowResult.posterPath) {
                                embed.setThumbnail(`${api_config.images.secureBaseUrl}w500${tvshowResult.posterPath}`);
                            }
                            if (tvshowResult.originalName) {
                                embed.addFields({ name: "Original name", value: tvshowResult.originalName });
                            }

                            embed.addFields({ name: "Rating", value: `${Math.round((tvshowResult.voteAverage) * 10)}/100`, inline: true });
                            embed.addFields({ name: "Seasons", value: `${tvshowResult.numberOfSeasons}`, inline: true });
                            embed.addFields({ name: "Episodes", value: `${tvshowResult.numberOfEpisodes}`, inline: true });
                            embed.addFields({ name: "Status", value: toProperCase(tvshowResult.status) });
                            embed.addFields({ name: "Genres", value: tvshowResult.genres.map((elem: { name: any; }) => elem.name).join(", "), inline: true });

                            if (tvshowResult.posterPath) {
                                embed.setImage(`${api_config.images.secureBaseUrl}w780${tvshowResult.backdropPath}`);
                            }

                            if (message) {
                                await handleResponseToMessage(client, collected.message, true, true, { embeds: [embed], components: [] });
                            } else {
                                await handleResponseToChannel(client, channel, { embeds: [embed] });
                                await collected.update({
                                    ...createSuccessResponse(client, "Selected movie has been posted."),
                                    components: [],
                                });
                            }
                        } catch (ex) {
                            console.error("Error querying TMDb for show:", ex);
                            return handleErrorResponseToMessage(client, msg!, true, "ephemeral", {
                                ...createErrorResponse(client, "An error occured while fetching this tv show. Please try again later."),
                                components: [],
                            });
                        }
                    }).catch(() => {
                        return handleErrorResponseToMessage(client, msg!, true, "ephemeral", {
                            ...createErrorResponse(client, "Timeout of 30 seconds exceeded, search aborted."),
                            components: [],
                        });
                    });
                }
            } else {
                return handleResponseToMessage(client, message || interaction, false, "ephemeral", createMissingParamsErrorResponse(client, config));
            }
        } catch(err) {
            console.error("Error querying TMDb for tv show:", err);
            return handleErrorResponseToMessage(client, message, false, "ephemeral", {
                ...createErrorResponse(client, "An error occured while fetching this tv show. Please try again later."),
                components: [],
            });
        }
    },
};