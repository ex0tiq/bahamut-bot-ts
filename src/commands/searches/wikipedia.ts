import { CommandConfig } from "../../../typings";
import wiki from "wikijs";
import { isInt } from "../../lib/validateFunctions";
import { CommandType, CooldownTypes } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import {
    createErrorResponse, createMissingParamsErrorResponse, createSuccessResponse,
    handleErrorResponseToMessage,
    handleResponseToChannel,
    handleResponseToMessage,
} from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "wikipedia",
    aliases: ["wiki"],
    type: CommandType.LEGACY,
    description: "Search something on wikipedia",
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
                const results = await wiki({
                    apiUrl: `https://${settings.language}.wikipedia.org/w/api.php`,
                }).search(args.join(" "), 10);
                let queueString = "";

                if (results.results.length == 1) {
                    try {
                        const wikiResults = await wiki({
                            apiUrl: `https://${settings.language}.wikipedia.org/w/api.php`,
                        }).page(results.results[0]);

                        if (!wikiResults) return handleErrorResponseToMessage(client, message || interaction, false, true, "No search results for this query.");

                        const embed = new Discord.EmbedBuilder()
                                .setTitle(wikiResults.raw.title)
                                .setDescription((await wikiResults.summary()))
                                .setURL(wikiResults.raw.fullurl)
                                .setFooter({ text: "Powered by Wikipedia" }),
                            mainImage = await wikiResults.mainImage();

                        if (mainImage) {
                            embed.setThumbnail(mainImage);
                        }

                        // Make this reply deferred
                        if (interaction) {
                            await interaction.deferReply({
                                ephemeral: false,
                            });
                        }

                        return handleResponseToMessage(client, message || interaction, false, true, { embeds: [embed] });
                    } catch (ex) {
                        console.error("Error querying wikipedia:", ex);
                        return handleErrorResponseToMessage(client, message || interaction, false, true, "An error occured while fetching wikipedia result. Please try again later.");
                    }
                } else {
                    if (!results || results.results.length <= 0) {
                        return handleErrorResponseToMessage(client, message || interaction, false, true, "No search results for this query.");
                    }

                    for (let i = 1; i <= ((results.results.length > 10) ? 10 : results.results.length); i++) {
                        queueString += `\`${i}\` ${results.results[i - 1]}\n`;
                    }

                    const filterMessage = (selectInteraction: any) => selectInteraction.customId === "wikipediaSearchSelect" && selectInteraction.user.id === member.id;

                    const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.SelectMenuBuilder()
                                .setCustomId("wikipediaSearchSelect")
                                .setPlaceholder("Nothing selected...")
                                .addOptions([{ label: "Cancel", value: "cancel" }].concat([...Array(results.results.length > 10 ? 10 : results.results.length).keys()].map(e => {
                                        return {
                                            label: results.results[e],
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

                            const wikiResults = await wiki({
                                apiUrl: `https://${settings.language}.wikipedia.org/w/api.php`,
                            }).page(results.results[selectedId]);

                            if (!wikiResults) return handleErrorResponseToMessage(client, message || interaction, false, true, "No search results for this query.");

                            const embed = new Discord.EmbedBuilder()
                                    .setTitle(wikiResults.raw.title)
                                    .setDescription((await wikiResults.summary()))
                                    .setURL(wikiResults.raw.fullurl)
                                    .setFooter({ text: "Powered by Wikipedia" }),
                                mainImage = await wikiResults.mainImage();

                            if (mainImage) {
                                embed.setThumbnail(mainImage);
                            }

                            if (message) {
                                await handleResponseToMessage(client, collected.message, true, true, {
                                    embeds: [embed],
                                    components: [],
                                });
                            } else {
                                await handleResponseToChannel(client, channel, { embeds: [embed] });
                                await collected.update({
                                    ...createSuccessResponse(client, "Selected Wikipedia entry has been posted."),
                                    components: [],
                                });
                            }
                        } catch (ex) {
                            console.error("Error querying Wikipedia entry:", ex);
                            return handleErrorResponseToMessage(client, msg, true, "ephemeral", {
                                ...createErrorResponse(client, "An error occured while fetching this Wikipedia entry. Please try again later."),
                                components: [],
                            });
                        }
                    }).catch(() => {
                        return handleErrorResponseToMessage(client, msg, true, "ephemeral", {
                            ...createErrorResponse(client, "Timeout of 30 seconds exceeded, search aborted."),
                            components: [],
                        });
                    });
                }
            } else {
                return handleResponseToMessage(client, message || interaction, false, "ephemeral", createMissingParamsErrorResponse(client, config));
            }
        } catch (err) {
            console.error("Error querying TMDb for tv show:", err);
            return handleErrorResponseToMessage(client, message, false, "ephemeral", {
                ...createErrorResponse(client, "An error occured while fetching Wikipedia data. Please try again later."),
                components: [],
            });
        }
    },
};