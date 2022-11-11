import emoji from 'node-emoji';
import {CommandType} from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import {getGuildSettings} from "../../lib/getFunctions";
import {
    createMissingParamsErrorResponse,
    createSuccessResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage
} from "../../lib/messageHandlers";
import {CommandConfig} from "../../../typings";
import {BahamutCommandPreChecker, PreCheckType} from "../../modules/BahamutCommandPreChecker";

const config: CommandConfig = {
    name: 'autoplay',
    aliases: ['ap', 'auto'],
    type: CommandType.LEGACY,
    description: 'Enable or disable the autoplay feature',
    expectedArgs: '<on or off>',
    options: [
        {
            name: 'state',
            description: 'Set autoplay on or off.',
            type: 3,
            required: false,
            choices: [
                {
                    name: "On",
                    value: "On"
                },
                {
                    name: "Off",
                    value: "Off"
                }
            ]
        }
    ],
    minArgs: 0,
    category: 'Music',
    guildOnly: true,
    deferReply: false,
    testOnly: false
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes('music')) return;

        const checks = new BahamutCommandPreChecker(client, { client, message, channel, args, member, interaction }, config, [
            { type: PreCheckType.USER_IS_DJ },
            { type: PreCheckType.CHANNEl_IS_MUSIC_CHANNEL },
        ]);
        if (await checks.runChecks()) return;

        let autoplay = false;

        if (args.length <= 0) {
            if (settings.music_autoplay) {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, createSuccessResponse(client, `${emoji.get('white_check_mark')} Autoplay is currently enabled!`, true))
            }
            else {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, createSuccessResponse(client, `${emoji.get('x')} Autoplay is currently disabled!`, true))
            }
        }
        else if (args.length > 0 && (args[0].toLowerCase() == 'on' || args[0].toLowerCase() == 'off')) {
            switch(args[0].toLowerCase()) {
                case 'on':
                    autoplay = true;
                    break;
                case 'off':
                    autoplay = false;
                    break;
                default:
                    autoplay = false;
                    break;
            }
        }
        else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
        }

        if (settings.music_autoplay == autoplay) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `${autoplay ? emoji.get('white_check_mark') : emoji.get('x')} Autoplay is already ${ autoplay ? 'enabled' : 'disabled'}!`);

        if (await client.bahamut.dbHandler.setDBGuildSetting(channel.guild, 'music_autoplay', args[0].toLowerCase() === 'on')) {
            client.bahamut.settings.set(channel.guild.id, await client.bahamut.dbHandler.getDBGuildSettings(channel.guild));

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, `${autoplay ? emoji.get('white_check_mark') : emoji.get('x')} Autoplay has been ${autoplay ? 'enabled' : 'disabled'}!`);
        }
        else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'Error while updating the Prefix. Please try again later!');
        }
    },
};