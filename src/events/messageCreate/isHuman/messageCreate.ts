//const { handleBotMessage } = require('../../../lib/messageConstructors');
//const AutoMod = require('../../../lib/automoderation/autoModeration');
//const RestrictedChannels = require('../../../lib/automoderation/restrictedChannels');
import BahamutClient from "../../../modules/BahamutClient";

const { flattenArray } = require('../../../lib/toolFunctions');
import Discord from "discord.js";
import WOK from "wokcommands";

// eslint-disable-next-line no-unused-vars
export default async (message: Discord.Message, client: BahamutClient, instance: WOK) => {
    // Implement auto moderation
    //const mod = new AutoMod(client, message.guild, message);
    //if (await mod.runAutoModChecks()) return;
    //
    // Restricted channels checks
    //const restrict = new RestrictedChannels(client, instance, message.guild, message);
    //if (await restrict.runRestrictChecks()) return;
    //

    if (message.author.bot) return;

    //const settings = await client.getSettings(message.guild);

    // Checks if the bot was mentioned, with no message after it, returns the prefix.
    //const prefixMention = new RegExp(`^<@!?${client.user.id}>( |)$`);
    //if (message.content.match(prefixMention)) {
    //    return handleBotMessage(client, message, 'info', {
    //        title: 'Prefix',
    //        desc: `The current bot prefix on this server is \`${settings.prefix}\`.`,
    //    });
    //}

    // If the member on a guild is invisible or not cached, fetch them.
    //if (message.guild && !message.member) {
    //    await message.guild.fetchMember(message.author);
    //}

    //const commands = flattenArray(Array.from(client.cmdHandler.commandHandler.commands).map(([key,]) => key));
    //if (!message.content.startsWith(settings.prefix) && !commands.includes(message.content.split(' ')[0].replace(settings.prefix, ''))) {
    //    await client.levelSystem.handleNewUserMessage(client, message, message.author);
    //}
};
