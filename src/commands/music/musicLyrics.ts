import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers";
import { CommandConfig } from "../../../typings";
// Not ES compatible imports
const Genius = require("genius-lyrics");

const config: CommandConfig = {
    name: "lyrics",
    aliases: ["ap", "auto"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get the lyrics to the currently playing song or search for another song",
    expectedArgs: "[song name]",
    options: [
        {
            name: "name",
            description: "Name of the song to search for.",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    minArgs: 0,
    category: "Music",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    deferReply: true,
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

        const GeniusClient = new Genius.Client(client.bahamut.config.genius_token);

        if (args.length === 0) {
            const checks = new BahamutCommandPreChecker(client, {
                client,
                message,
                channel,
                args,
                member,
                interaction,
            }, config, [
                { type: PreCheckType.USER_IN_VOICE_CHANNEL },
                { type: PreCheckType.MUSIC_NODES_AVAILABLE },
            ]);
            if (await checks.runChecks()) return;

            const player = client.bahamut.musicHandler.manager.create({
                guild: channel.guild.id,
                textChannel: channel.id,
            });

            const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
                { type: PreCheckType.MUSIC_IS_PLAYING, player: player },
            ]);
            if (await musicPlayingCheck.runChecks()) return;
            if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this guild. Please finish it before searching for lyrics.");
            if (player.queue.current!.isStream) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Lyrics cannot be searched for webstreams!");

            const search = await searchLyrics(client, GeniusClient, player.queue.current!.title);

            if (!search || search.result === null) {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Sorry, I couldn't find any lyrics for \`${player.queue.current!.title}\`.`);
            } else {
                const templyrics = search.lyrics.replace(/\n/g, "%b");
                if (templyrics.length >= 2000) {
                    await handleErrorResponseToMessage(
                        client,
                        message || interaction,
                        false,
                        config.deferReply,
                        `**Lyrics for ${search.result.fullTitle}**`
                    );

                    const temp = templyrics.match(/.{1,1950}(\s|$)/g);

                    for (const t of temp) {
                        if (message) await message.channel.send(t.trim().replace(/%b/g, "\n"));
                        else interaction.channel?.send(t.trim().replace(/%b/g, "\n"));
                    }

                    if (message) await message.channel.send("*Powered by Genius*");
                    else interaction.channel?.send("*Powered by Genius*");
                    return;
                } else {
                    return handleResponseToMessage(
                        client,
                        message || interaction,
                        false,
                        config.deferReply,
                        {
                            embeds: [
                                new Discord.EmbedBuilder()
                                    .setTitle(`Lyrics for ${search.result.fullTitle}`)
                                    .setDescription(search.lyrics)
                                    .setFooter({ text: "Powered by Genius" }),
                            ],
                        }
                    );
                }
            }
        } else {
            const search = await searchLyrics(client, GeniusClient, args.join(" "));

            if (!search || search.result === null) {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `Sorry, I couldn't find any lyrics for \`${args.join(" ")}\`.`);
            }

            const templyrics = search.lyrics.replace(/\n/g, "%b");
            if (templyrics.length >= 2000) {
                await handleErrorResponseToMessage(
                    client,
                    message || interaction,
                    false,
                    config.deferReply,
                    `**Lyrics for ${search.result.fullTitle}**`
                );

                const temp = templyrics.match(/.{1,1950}(\s|$)/g);

                for (const t of temp) {
                    if (message) await message.channel.send(t.trim().replace(/%b/g, "\n"));
                    else interaction.channel?.send(t.trim().replace(/%b/g, "\n"));
                }

                if (message) await message.channel.send("*Powered by Genius*");
                else interaction.channel?.send("*Powered by Genius*");
                return;
            } else {
                return handleResponseToMessage(
                    client,
                    message || interaction,
                    false,
                    config.deferReply,
                    {
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setTitle(`Lyrics for ${search.result.fullTitle}`)
                                .setDescription(search.lyrics)
                                .setFooter({ text: "Powered by Genius" }),
                        ],
                    }
                );
            }
        }
    },
};

const searchLyrics = async (client: BahamutClient, geniusClient: unknown, searchTerm: string) => {
    try {
        // @ts-ignore
        const searches = await geniusClient.songs.search(searchTerm),
            searchResult = searches[0] || null;

        if (searchResult == null) {
            return null;
        } else {
            return {
                lyrics: await (searchResult.lyrics()),
                result: searchResult,
            };
        }
    } catch (err) {
        console.error("Error while searching for song lyrics:", err);
        return null;
    }
};

