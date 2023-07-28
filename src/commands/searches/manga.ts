import { CommandConfig } from "../../../typings.js";
import { CommandType, CooldownTypes } from "wokcommands";
import { default as anilist } from "anilist-node";
import { isInt } from "../../lib/validateFunctions.js";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { toProperCase } from "../../lib/toolFunctions.js";
import {
    createErrorResponse, createMissingParamsErrorResponse,
    createSuccessResponse,
    handleErrorResponseToMessage,
    handleResponseToChannel,
    handleResponseToMessage,
} from "../../lib/messageHandlers.js";

// @ts-ignore
const Anilist = new anilist();

const config: CommandConfig = {
    name: "manga",
    type: CommandType.LEGACY,
    description: "Search for a manga on anilist.co.",
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

        try {
            if (args.length > 0) {
                const manga = await Anilist.searchEntry.manga(args.join(" "), undefined, 1, 10);
                let queueString = "";

                if (manga.media.length == 1) {
                    try {
                        const mangaResult = await Anilist.media.manga(manga.media[0].id);

                        const embed = new Discord.EmbedBuilder()
                            .setTitle(`${mangaResult.title.userPreferred} (${mangaResult.startDate.year} - ${(mangaResult.status === "RELEASING") ? "" : mangaResult.endDate.year})`)
                            .setThumbnail(mangaResult.coverImage.small ? mangaResult.coverImage.small : mangaResult.coverImage.medium)
                            .setDescription(mangaResult.description.replace(/<br>/g, "\n").replace(/\n\n/g, "\n").replace(/(<([^>]+)>)/gi, ""))
                            .setURL(mangaResult.siteUrl)
                            .setFooter({ text: "Powered by Anilist.co" });

                        if (mangaResult.title.romaji) {
                            embed.addFields({ name: "Japanese name", value: mangaResult.title.romaji });
                        }
                        if (mangaResult.title.native) {
                            embed.addFields({ name: "Native name", value: mangaResult.title.native });
                        }

                        embed.addFields({ name: "Rating", value: `${Math.round(mangaResult.averageScore)}/100`, inline: true });
                        embed.addFields({ name: "Chapters", value: `${((mangaResult.chapters) ? mangaResult.chapters : "0")}`, inline: true });
                        embed.addFields({ name: "Volumes", value: `${((mangaResult.volumes) ? mangaResult.volumes : "0")}`, inline: true });
                        embed.addFields({ name: "Release year", value: `${mangaResult.startDate.year}`, inline: true });
                        embed.addFields({ name: "NSFW", value: ((mangaResult.isAdult) ? "Yes" : "No"), inline: true });
                        embed.addFields({ name: "Status", value: toProperCase(mangaResult.status) });
                        embed.addFields({ name: "Genres", value: mangaResult.genres.join(", "), inline: true });
                        embed.addFields({ name: "Tags", value: mangaResult.tags.map((elem: { name: any; }) => elem.name).join(", "), inline: true });

                        // Make this reply deferred
                        if (interaction) {
                            await interaction.deferReply({
                                ephemeral: false,
                            });
                        }

                        return handleResponseToMessage(client, message || interaction, false, true, { embeds: [embed] });
                    } catch (ex) {
                        console.error("Error querying anilist.co for anime:", ex);
                        return handleErrorResponseToMessage(client, message || interaction, false, true, "An error occured while fetching this manga. Please try again later.");
                    }
                } else {
                    if (manga.media.length <= 0) {
                        return handleErrorResponseToMessage(client, message || interaction, false, true, "No search results for this query.");
                    }

                    for (let i = 1; i <= ((manga.media.length > 10) ? 10 : manga.media.length); i++) {
                        queueString += `\`${i}\` [${manga.media[i - 1].title.userPreferred}](https://anilist.co/anime/${manga.media[i - 1].id})\n`;
                    }

                    const filterMessage = (selectInteraction: any) => selectInteraction.customId === "mangaSearchSelect" && selectInteraction.user.id === member.id;

                    const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.SelectMenuBuilder()
                                .setCustomId("mangaSearchSelect")
                                .setPlaceholder("Nothing selected...")
                                .addOptions([{ label: "Cancel", value: "cancel" }].concat([...Array(manga.media.length > 10 ? 10 : manga.media.length).keys()].map(e => {
                                        return {
                                            label: manga.media[e].title.userPreferred,
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

                            if (selectedId > manga.media.length || selectedId < 0) {
                                return collected.update({
                                    ...createErrorResponse(client, "Invalid id entered, search aborted, please look above for the possible values."),
                                    components: [],
                                });
                            }

                            const mangaResult = await Anilist.media.manga(manga.media[selectedId].id),
                                embed = new Discord.EmbedBuilder()
                                    .setTitle(`${mangaResult.title.userPreferred} (${mangaResult.startDate.year} - ${(mangaResult.status === "RELEASING") ? "" : mangaResult.endDate.year})`)
                                    .setThumbnail(mangaResult.coverImage.small ? mangaResult.coverImage.small : mangaResult.coverImage.medium)
                                    .setDescription(mangaResult.description.replace(/<br>/g, "\n").replace(/\n\n/g, "\n").replace(/(<([^>]+)>)/gi, ""))
                                    .setURL(mangaResult.siteUrl)
                                    .setFooter({ text: "Powered by Anilist.co" });

                            if (mangaResult.title.romaji) {
                                embed.addFields({ name: "Japanese name", value: mangaResult.title.romaji });
                            }
                            if (mangaResult.title.native) {
                                embed.addFields({ name: "Native name", value: mangaResult.title.native });
                            }

                            embed.addFields({ name: "Rating", value: `${Math.round(mangaResult.averageScore)}/100`, inline: true });
                            embed.addFields({ name: "Chapters", value: `${((mangaResult.chapters) ? mangaResult.chapters : "0")}`, inline: true });
                            embed.addFields({ name: "Volumes", value: `${((mangaResult.volumes) ? mangaResult.volumes : "0")}`, inline: true });
                            embed.addFields({ name: "Release year", value: `${mangaResult.startDate.year}`, inline: true });
                            embed.addFields({ name: "NSFW", value: ((mangaResult.isAdult) ? "Yes" : "No"), inline: true });
                            embed.addFields({ name: "Status", value: toProperCase(mangaResult.status) });
                            embed.addFields({ name: "Genres", value: mangaResult.genres.join(", "), inline: true });
                            embed.addFields({ name: "Tags", value: mangaResult.tags.map((elem: { name: any; }) => elem.name).join(", "), inline: true });

                            await handleResponseToChannel(client, channel, { embeds: [embed] });

                            if (message) {
                                await handleResponseToMessage(client, collected.message, true, true, { embeds: [embed], components: [] });
                            } else {
                                await handleResponseToChannel(client, channel, { embeds: [embed] });
                                await collected.update({
                                    ...createSuccessResponse(client, "Selected manga has been posted."),
                                    components: [],
                                });
                            }
                        } catch (ex) {
                            console.error("Error querying anilist.co for manga:", ex);
                            return handleErrorResponseToMessage(client, msg!, true, "ephemeral", {
                                ...createErrorResponse(client, "An error occured while fetching this manga. Please try again later."),
                                components: [],
                            });
                        }
                    }).catch(async () => {
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
            console.error("Error querying anilist.co for manga:", err);
            return handleErrorResponseToMessage(client, message, false, "ephemeral", {
                ...createErrorResponse(client, "An error occured while fetching this anime. Please try again later."),
                components: [],
            });
        }
    },
};
