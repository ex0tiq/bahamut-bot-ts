import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import * as emoji from "node-emoji";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import {
    handleErrorResponseToMessage,
    handleResponseToMessage,
    handleSuccessResponseToMessage,
} from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "skip",
    type: CommandType.LEGACY,
    description: "Vote to skip the song. If the majority of people listening agrees, the current song will be skipped.",
    category: "Music",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        let userIsDJ = false;
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return;

        // Run pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, member, interaction }, config, [
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]);
        if (await checks.runChecks()) return;

        if (!(userIsDJ = await client.bahamut.musicHandler.userHasDJRights(member, channel.guild))) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, client.bahamut.musicHandler.getUserNoDJPermMessage());

        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            textChannel: channel.id,
        });

        const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_IS_PLAYING, player: player },
        ]);
        if (await musicPlayingCheck.runChecks()) return;

        if (userIsDJ) {
            player.stop();

            return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("next_track")} Current track has been skipped!`);
        } else if (member.voice.channel && member.voice.channel.members.size > 2) {
            // TODO: Implement vote skips
            const max = member.voice.channel.members.size - 1;
            const needed = Math.ceil(max / 2);

            if (!client.bahamut.musicHandler.voteSkips.has(player.queue.current!.identifier!)) client.bahamut.musicHandler.voteSkips.set(player.queue.current!.identifier!, []);
            const voteSkips = client.bahamut.musicHandler.voteSkips.get(player.queue.current!.identifier!) || [];

            if (voteSkips.includes(member.id)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "You already voted to skip the current song!");

            // Add the member to voteSkips
            voteSkips.push(member.id);
            client.bahamut.musicHandler.voteSkips.set(player.queue.current!.identifier!, voteSkips);

            if (voteSkips.length >= needed) {
                player.stop();

                client.bahamut.musicHandler.voteSkips.delete(player.queue.current!.identifier!);

                return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("next_track")} Skipped!\n\n\`${voteSkips.length}\` users voted to skip the current song.`);
            } else {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setTitle("Vote Skip")
                            .setDescription(`\`${voteSkips.length}\` of \`${needed}\` needed users have voted to skip the current song!`),
                    ],
                });
            }
        } else {
            player.stop();

            return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("next_track")} Current track has been skipped!`);
        }
    },
};