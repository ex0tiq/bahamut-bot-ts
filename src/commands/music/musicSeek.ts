import * as emoji from "node-emoji";
import { formatDuration, toSecond } from "../../lib/durationFunctions.js";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions.js";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker.js";
import { handleErrorResponseToMessage, handleSuccessResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "seek",
    type: CommandType.LEGACY,
    description: "Seek the current song to position X (e.g. XX:XX or in seconds, these can be prepended with + or -)",
    expectedArgs: "<seconds>",
    options: [
        {
            name: "position",
            description: "Seek the current song to position X (e.g. XX:XX or in seconds, these can be prepended with + or -)",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    minArgs: 1,
    category: "Music (/music)",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        const player = client.bahamut.musicHandler.getPlayer(channel.guild.id);

        // Run pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, member, interaction }, config, [
            { type: PreCheckType.GUILD_IS_PREMIUM, customErrorMessage: `Seeking requires an active premium subscription.\nIf you want to know more about this, please check out our [website](${client.bahamut.config.website_link}).` },
            { type: PreCheckType.USER_IS_DJ },
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            { type: PreCheckType.ALL_PARAMS_PROVIDED, paramsCheck: (args.length > 0) },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
            { type: PreCheckType.MUSIC_IS_PLAYING, player: player }
        ]);
        if (await checks.runChecks()) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it before seeking.");

        const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_IS_AVAILABLE, player: player },
        ]);
        if (await musicPlayingCheck.runChecks()) return;
        if (!player!.kazaPlayer.queue.current) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There are no songs in the queue to seek in!");
        if (!player!.kazaPlayer.queue.current.isSeekable) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "The current song is not seekable!");

        let seconds = 0;

        try {
            if (args[0][0] === "-" || args[0][0] === "+") {
                switch (args[0][0]) {
                    case "+":
                        seconds = player!.kazaPlayer.position + ((parseInt(args[0].split("+")[1])) * 1000);
                        break;
                    case "-":
                        seconds = player!.kazaPlayer.position - ((parseInt(args[0].split("-")[1])) * 1000);
                        break;
                    default:
                        seconds = parseInt(args[0]) * 1000;
                        break;
                }
            } else {
                if (args[0].includes(":")) {
                    seconds = toSecond(args[0]) * 1000;
                } else {
                    seconds = parseInt(args[0]) * 1000;
                }
            }
        } catch {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `\`${args[0]}\` is not a valid seek arg!`);
        }

        if (seconds > player!.kazaPlayer.queue.current.length!) {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Can't seek farther than the length of the song!");
        }
        if (args[0][0] === "-" && (player!.kazaPlayer.position - seconds) <= 0) {
            seconds = 0;
        }

        try {
            player!.kazaPlayer.seek(seconds);

            return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get("arrow_right")} Current track has been seeked to \`${formatDuration(seconds)}\`!`);
        } catch (ex) {
            console.error("Error while seeking song:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while seeking the song!");
        }
    },
};