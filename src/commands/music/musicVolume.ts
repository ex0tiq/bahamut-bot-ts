import {CommandConfig} from "../../../typings";
import {CommandType} from "wokcommands";
import emoji from 'node-emoji';
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import {getGuildSettings} from "../../lib/getFunctions";
import {BahamutCommandPreChecker, PreCheckType} from "../../modules/BahamutCommandPreChecker";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
    handleSuccessResponseToMessage
} from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: 'volume',
    aliases: ['v', 'vol'],
    type: CommandType.LEGACY,
    description: 'Set the volume of the current music.',
    expectedArgs: '<1-100>',
    options: [
        {
            name: 'volume-percent',
            description: 'Set volume percentage (1 to 100%).',
            type: Discord.ApplicationCommandOptionType.Integer,
            minValue: 1,
            maxValue: 100,
            required: false

        }
    ],
    minArgs: 0,
    category: 'Music',
    guildOnly: true,
    testOnly: false,
    deferReply: true
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, args, interaction}: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes('music')) return;

        const checks = new BahamutCommandPreChecker(client, { client, message, channel, member, interaction }, config, [
            { type: PreCheckType.GUILD_IS_PREMIUM, customErrorMessage: `Changing music volume requires an active premium subscription.\nIf you want to know more about this, please check out our [website](${client.bahamut.config.website_link}).` },
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

        if (args.length < 1) {
            return handleResponseToMessage(client, message || interaction, false, config.deferReply, `${player.volume <= 0 ? emoji.get('mute') : (player.volume < 50 ? emoji.get('sound') : emoji.get('loud_sound'))} Volume is currently set to \`${player.volume}%\``);
        }

        const volume = parseInt(args[0]);
        if (isNaN(volume) || (volume < 0 || volume > 100)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));

        if (player.queue.current || player.queue.size > 0) player.setVolume(volume);

        if (await client.bahamut.dbHandler.setDBGuildSetting(channel.guild, 'music_volume', args[0])) {
            client.bahamut.settings.set(channel.guild.id, await client.bahamut.dbHandler.getDBGuildSettings(channel.guild));

            return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${volume <= 0 ? emoji.get('mute') : (volume < 50 ? emoji.get('sound') : emoji.get('loud_sound'))} Volume has been set to \`${volume}\`%!`);
        }
        else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'Error while updating the music volume. Please try again later!');
        }
    },
};