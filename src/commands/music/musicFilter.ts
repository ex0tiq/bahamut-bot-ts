import emoji from 'node-emoji';
import {CommandType} from "wokcommands";
import {toProperCase} from "../../lib/toolFunctions";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import {getGuildSettings} from "../../lib/getFunctions";
import {
    handleErrorResponseToMessage,
    handleResponseToMessage,
    handleSuccessResponseToMessage
} from "../../lib/messageHandlers";

const config = {
    name: 'filter',
    aliases: ['fil', 'flt'],
    type: CommandType.LEGACY,
    description: 'Toggle a filter to apply to the music playback. Use "list" for a list of all available filters.',
    expectedArgs: '[list or name] [% strength]',
    options: [
        {
            name: 'name',
            description: 'Set audio filter.',
            type: 3,
            required: false,
            choices: (() => {
                const choices = [];
                let filters = require("../../../assets/music_filters.json");
                for (const [name,] of Object.entries(filters).sort(([a1,], [a2,]) => a1.localeCompare(a2))) {
                    choices.push({name: toProperCase(name), value: name});
                }
                return choices;
            })()
        },
        {
            name: 'intensity',
            description: 'Set filter intensity in % (this does not work for every filter).',
            type: 4,
            required: false,
            minValue: 1,
            maxValue: 100
        }
    ],
    minArgs: 0,
    category: 'Music',
    deferReply: true,
    testOnly: false,
    guildOnly: true,
};

module.exports = {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         args,
                         member,
                         interaction
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.GuildTextBasedChannel, member: Discord.GuildMember, args: string[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes('music')) return;

        if (!settings.premium_user) {
            // Streams not allowed for non premium users
            return handleErrorResponseToMessage(client,
                message || interaction,
                false,
                config.deferReply,
                await client.bahamut.premiumHandler.getGuildNotPremiumMessage(`Using music filters requires an active premium subscription.\nIf you want to know more about this, please check out our [website](${client.bahamut.config.website_link}).`)
            );
        }

        if (!await client.bahamut.musicHandler.userHasDJRights(member, channel.guild)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, client.bahamut.musicHandler.getUserNoDJPermMessage());
        if (!await client.bahamut.musicHandler.isChannelMusicChannel(channel)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await client.bahamut.musicHandler.getChannelNotMusicChannelMessage(message || interaction));
        if (!client.bahamut.musicHandler.isUserInVoiceChannel(member)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'You\'re not in a voice channel!');
        if (!client.bahamut.musicHandler.isUserInSameVoiceChannelAsBot(channel.guild, member)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'You\'re not in the same voice channel as the bot!');

        if (!client.bahamut.musicHandler.manager.leastUsedNodes.first()) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'There are no music nodes available. Please try again later.');

        const filters = client.bahamut.musicHandler.filters;
        let filterText = '';

        // eslint-disable-next-line no-unused-vars
        for (const [name, val] of Object.entries(filters).sort(([a1, b1], [a2, b2]) => a1.localeCompare(a2))) {
            filterText += `• ${toProperCase(name)} \n`;
        }

        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            textChannel: channel.id,
        });

        if (args.length <= 0) {
            if (message) await message.reactions.removeAll();

            if (!player || !player.get('music_filter')) {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get('control_knobs')} There is currently no filter applied!`);
            } else {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get('control_knobs')} The filter \`${toProperCase(player.get('music_filter'))}\` is currently applied!`);
            }
        } else if (args.length > 0) {
            if (args[0].toLowerCase() === 'list') {
                if (message) await message.reactions.removeAll();

                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setTitle('Possible Filters')
                            .setDescription(filterText).
                            setFooter({text: 'Note: Filters that speed up playback can cause issues with webstreams (e.g. nightcore)!'})
                    ]
                });
            }
            if ((Object.keys(filters).includes(args[0].toLowerCase())) || args[0].toLowerCase() === 'off') {
                if (!player.playing) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'There is nothing playing at the moment!');
                if (!player.queue.current) return handleResponseToMessage(client, message || interaction, false, config.deferReply, 'There are no songs in the queue to apply a filter!');

                if (['off', 'reset'].includes(args[0].toLowerCase())) {
                    const obj = {
                        op: 'filters',
                        guildId: channel.guild.id,
                    };

                    await player.node.send(obj);
                    player.set('music_filter', null);
                } else if (args[0].toLowerCase() === 'bassboost') {
                    const obj = {
                        op: 'filters',
                        guildId: channel.guild.id,
                        equalizer: [],
                    };
                    let boostPercent = 0;

                    if (args.length > 1 && parseInt(args[1])) {
                        boostPercent = parseInt(args[1]);
                    } else {
                        boostPercent = (0.22 * 100);
                    }

                    // @ts-ignore
                    obj.equalizer = [...Array(6).fill(boostPercent / 100).map((x: number, i: number) => ({band: i, gain: x}))];

                    await player.node.send(obj);
                    player.set('music_filter', 'bassboost');

                    if (message) await message.reactions.removeAll();

                    return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get('ballot_box_with_check')} Current queue filter set to \`Bassboost\` with \`${Math.floor(boostPercent)}%\` boost!`);
                } else {
                    const obj = {
                        op: 'filters',
                        guildId: channel.guild.id,
                        // @ts-ignore
                        ...filters[args[0].toLowerCase()],
                    };

                    await player.node.send(obj);
                    player.set('music_filter', args[0].toLowerCase());
                }

                return handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, `${emoji.get('ballot_box_with_check')} Current queue filter has been set to \`${args[0] ? toProperCase(args[0]) : 'Off'}\`!`);
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'Invalid filter!');
            }
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, 'Unknown error while applying filter!');
        }
    },
};
