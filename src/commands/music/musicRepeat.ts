import emoji from 'node-emoji';
import {CommandConfig} from "../../../typings";
import {CommandType} from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import {getGuildSettings} from "../../lib/getFunctions";
import {BahamutCommandPreChecker, PreCheckType} from "../../modules/BahamutCommandPreChecker";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage
} from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: 'repeat',
    aliases: ['loop', 'rp'],
    type: CommandType.LEGACY,
    description: 'Repeat the current song or queue (queue, song or off).',
    expectedArgs: '<mode>',
    options: [
        {
            name: 'mode',
            description: 'Set repeat mode.',
            type: 3,
            required: true,
            choices: [
                { name: "Queue", value: "queue" },
                { name: "Song", value: "song" },
                { name: "Off", value: "off" }
            ]
        }
    ],
    minArgs: 1,
    category: 'Music',
    guildOnly: true,
    testOnly: false,
    deferReply: true
};

export default {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         member,
                         args,
                         interaction
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes('music')) return;

        // Run command pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel, args, member, interaction }, config, [
            { type: PreCheckType.USER_IS_DJ },
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
            { type: PreCheckType.USER_IN_VOICE_CHANNEL },
            { type: PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT },
            { type: PreCheckType.MUSIC_NODES_AVAILABLE }
        ]);
        if (await checks.runChecks()) return;

        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            textChannel: channel.id,
        });

        const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_IS_PLAYING, player: player }
        ]);
        if (await musicPlayingCheck.runChecks()) return;

        let mode = null, stringMode = null;
        if (['off', 'reset'].includes(args[0].toLowerCase())) {
            mode = 0;
            player.setTrackRepeat(false);
            player.setQueueRepeat(false);
        }
        else if (['song', 's'].includes(args[0].toLowerCase())) {
            mode = 1;
            player.setTrackRepeat(true);
        }
        else if (['queue', 'q'].includes(args[0].toLowerCase())) {
            mode = 2;
            player.setQueueRepeat(true);
        }
        else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
        }

        stringMode = mode ? mode == 2 ? 'Repeat queue' : 'Repeat song' : 'Off';

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, `${mode == 1 ? emoji.get('repeat_one') : emoji.get('repeat')} Repeat mode set to \`${stringMode}\`!`);
    },
};