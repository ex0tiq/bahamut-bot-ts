import { CommandConfig } from "../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import anilist from "anilist-node";
import { isInt } from "../../lib/validateFunctions";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import { toProperCase } from "../../lib/toolFunctions";
import {
    createErrorResponse, createMissingParamsErrorResponse,
    createSuccessResponse,
    handleErrorResponseToMessage,
    handleResponseToChannel,
    handleResponseToMessage,
} from "../../lib/messageHandlers";

const Anilist = new anilist();

const config: CommandConfig = {
    name: "anime",
    type: CommandType.LEGACY,
    description: "Search for an anime on anilist.co.",
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
                const anim = await Anilist.searchEntry.anime(args.join(" "), undefined, 1, 10);
                let queueString = "";

                if (anim.media.length == 1) {
                    try {
                        const aniResult = await Anilist.media.anime(anim.media[0].id),
                            embed = new Discord.EmbedBuilder()
                            .setTitle(`${aniResult.title.userPreferred} (${aniResult.startDate.year} - ${(aniResult.status === "RELEASING") ? "" : aniResult.endDate.year})`)
                            .setThumbnail((aniResult.coverImage.small) ? aniResult.coverImage.small : aniResult.coverImage.medium)
                            .setDescription(aniResult.description.replace(/<br>/g, "\n").replace(/\n\n/g, "\n").replace(/(<([^>]+)>)/gi, "") + ((aniResult.trailer) ? `\n\n**[Trailer](${aniResult.trailer})**` : ""))
                            .setURL(aniResult.siteUrl)
                            .setFooter({ text: "Powered by Anilist.co" });


                        if (aniResult.title.romaji) {
                            embed.addFields({ name: "Japanese name", value: aniResult.title.romaji });
                        }
                        if (aniResult.title.native) {
                            embed.addFields({ name: "Native name", value: aniResult.title.native });
                        }

                        embed.addFields({ name: "Rating", value: `${Math.round(aniResult.averageScore)}/100`, inline: true });
                        embed.addFields({ name: "Episodes", value: `${aniResult.episodes}`, inline: true });
                        embed.addFields({ name: "Episode length", value: `${aniResult.duration} min`, inline: true });
                        embed.addFields({ name: "Release year", value: `${aniResult.seasonYear}`, inline: true });
                        embed.addFields({ name: "Type", value: aniResult.format, inline: true });
                        embed.addFields({ name: "NSFW", value: ((aniResult.isAdult) ? "Yes" : "No"), inline: true });
                        embed.addFields({ name: "Status", value: toProperCase(aniResult.status) });
                        embed.addFields({ name: "Genres", value: aniResult.genres.join(", "), inline: true });
                        embed.addFields({ name: "Tags", value: aniResult.tags.map((elem) => elem.name).join(", "), inline: true });

                        if (aniResult.bannerImage) {
                            embed.setImage(aniResult.bannerImage);
                        }

                        // Make this reply deferred
                        if (interaction) {
                            await interaction.deferReply({
                                ephemeral: false,
                            });
                        }

                        return handleResponseToMessage(client, message || interaction, false, true, { embeds: [embed] });
                    } catch (ex) {
                        console.error("Error querying anilist.co for anime:", ex);
                        return handleErrorResponseToMessage(client, message || interaction, false, true, "An error occured while fetching this anime. Please try again later.");
                    }
                } else {
                    if (anim.media.length <= 0) {
                        return handleErrorResponseToMessage(client, message || interaction, false, true, "No search results for this query.");
                    }

                    for (let i = 1; i <= ((anim.media.length > 10) ? 10 : anim.media.length); i++) {
                        queueString += `\`${i}\` [${anim.media[i - 1].title.userPreferred}](https://anilist.co/anime/${anim.media[i - 1].id})\n`;
                    }

                    const filterMessage = (selectInteraction: any) => selectInteraction.customId === "animeSearchSelect" && selectInteraction.user.id === member.id;

                    const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.SelectMenuBuilder()
                                .setCustomId("animeSearchSelect")
                                .setPlaceholder("Nothing selected...")
                                .addOptions([{ label: "Cancel", value: "cancel" }].concat([...Array(anim.media.length > 10 ? 10 : anim.media.length).keys()].map(e => {
                                        return {
                                            label: anim.media[e].title.userPreferred,
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

                            if (selectedId > anim.media.length || selectedId < 0) {
                                return collected.update({
                                    ...createErrorResponse(client, "Invalid id entered, search aborted, please look above for the possible values."),
                                    components: [],
                                });
                            }

                            const aniResult = await Anilist.media.anime(anim.media[selectedId].id),
                                embed = new Discord.EmbedBuilder()
                                    .setTitle(`${aniResult.title.userPreferred} (${aniResult.startDate.year} - ${(aniResult.status === "RELEASING") ? "" : aniResult.endDate.year})`)
                                    .setThumbnail(aniResult.coverImage.small ? aniResult.coverImage.small : aniResult.coverImage.medium)
                                    .setDescription(aniResult.description.replace(/<br>/g, "\n").replace(/\n\n/g, "\n").replace(/(<([^>]+)>)/gi, "") + ((aniResult.trailer) ? `\n\n**[Trailer](${aniResult.trailer})**` : ""))
                                    .setURL(aniResult.siteUrl)
                                    .setFooter({ text: "Powered by Anilist.co" });

                            if (aniResult.title.romaji) {
                                embed.addFields({ name: "Japanese name", value: aniResult.title.romaji });
                            }
                            if (aniResult.title.native) {
                                embed.addFields({ name: "Native name", value: aniResult.title.native });
                            }

                            embed.addFields({ name: "Rating", value: `${Math.round(aniResult.averageScore)}/100`, inline: true });
                            embed.addFields({ name: "Episodes", value: `${aniResult.episodes}`, inline: true });
                            embed.addFields({ name: "Episode length", value: `${aniResult.duration} min`, inline: true });
                            embed.addFields({ name: "Release year", value: `${aniResult.seasonYear}`, inline: true });
                            embed.addFields({ name: "Type", value: aniResult.format, inline: true });
                            embed.addFields({ name: "NSFW", value: ((aniResult.isAdult) ? "Yes" : "No"), inline: true });
                            embed.addFields({ name: "Status", value: toProperCase(aniResult.status) });
                            embed.addFields({ name: "Genres", value: aniResult.genres.join(", "), inline: true });
                            embed.addFields({ name: "Tags", value: aniResult.tags.map((elem) => elem.name).join(", "), inline: true });

                            if (aniResult.bannerImage) {
                                embed.setImage(aniResult.bannerImage);
                            }

                            await handleResponseToChannel(client, channel, { embeds: [embed] });

                            await collected.update({
                                ...createSuccessResponse(client, "Selected anime has been posted."),
                                components: [],
                            });
                        } catch (ex) {
                            console.error("Error querying anilist.co for anime:", ex);
                            return handleErrorResponseToMessage(client, msg, true, "ephemeral", {
                                ...createErrorResponse(client, "An error occured while fetching this anime. Please try again later."),
                                components: [],
                            });
                        }
                    }).catch(async () => {
                        return handleErrorResponseToMessage(client, msg, true, "ephemeral", {
                            ...createErrorResponse(client, "Timeout of 30 seconds exceeded, search aborted."),
                            components: [],
                        });
                    });
                }
            } else {
                return handleResponseToMessage(client, message || interaction, false, "ephemeral", createMissingParamsErrorResponse(client, config));
            }
        } catch(err) {
            console.error("Error querying anilist.co for anime:", err);
            return handleErrorResponseToMessage(client, message, false, "ephemeral", {
                ...createErrorResponse(client, "An error occured while fetching this anime. Please try again later."),
                components: [],
            });
        }
    },
};