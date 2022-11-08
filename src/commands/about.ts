import Discord from "discord.js";
//const { handleBotMessage, constructMessageEmbed } = require('../lib/messageConstructors');
import emoji from "node-emoji";
import BahamutClient from "../modules/BahamutClient.js";
import {CommandType} from "wokcommands";
import {handleResponseToMessage} from "../lib/messageBuilders";

const config = {
    name: 'about',
    type: CommandType.BOTH,
    description: 'Get infos about the bot',
    category: 'System',
    cooldown: '10s',
    guildOnly: true,
    testOnly: true,
    deferReply: true
};

export default {
    ...config,
    callback: async ({ client, message, interaction }: { client: BahamutClient, message: Discord.Message, interaction: Discord.CommandInteraction }) => {
        await handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            "embeds": [
                new Discord.EmbedBuilder()
                    .setAuthor({name: "About", iconURL: client.bahamut.config.message_icons!.info})
                    .setDescription(`${((client.bahamut.config.invite_link) ? `You can invite this bot to another server using [this link](${client.bahamut.config.invite_link}).` : `There is currently no invite link available. ${emoji.get('cry')}`)}\n
                    If you have any issues you can join the support server [here](https://discord.com/invite/ygAmF244xp). \n\n\n*All icons used by the bot are provided by [Icons8](https://icons8.com/)*`)
                    .setThumbnail(client.user?.displayAvatarURL()!)
                    .setFields(
                        {name: "Version", value: process.env.npm_package_version!, inline: true},
                        {name: "Discord.js", value: Discord.version, inline: true},
                        {name: 'Node.js', value: process.version, inline: true},
                        {
                            name: 'Website',
                            value: `[${client.bahamut.config.website_link?.replace(/(http|https):\/\//g, '')}](${client.bahamut.config.website_link})`
                        },
                    )
                    .setFooter({text: 'This Bot is in active development and may contain bugs.\nPlease report any bug or problem you may find <3'})
            ]
        });
    },
};