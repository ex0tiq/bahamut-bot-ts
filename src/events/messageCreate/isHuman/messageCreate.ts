import BahamutClient from "../../../modules/BahamutClient.js";
import { flattenArray } from "../../../lib/toolFunctions.js";
import Discord from "discord.js";
import { getGuildSettings } from "../../../lib/getFunctions.js";
import { handleResponseToMessage } from "../../../lib/messageHandlers.js";
import RestrictedChannels from "../../../lib/automoderation/restrictedChannels.js";
import AutoModeration from "../../../lib/automoderation/automoderation.js";

// eslint-disable-next-line no-unused-vars
export default async (message: Discord.Message, client: BahamutClient) => {
    // Implement auto moderation
    const mod = new AutoModeration(client, message.guild!, message);
    if (await mod.runAutoModChecks()) return;
    //
    // Restricted channels checks
    const restrict = new RestrictedChannels(client, message.guild!, message);
    if (await restrict.runRestrictChecks()) return;

    if (message.author.bot) return;

    const settings = await getGuildSettings(client, message.guild!);

    // Checks if the bot was mentioned, with no message after it, returns the prefix.
    const prefixMention = new RegExp(`^<@!?${client.user!.id}>( |)$`);
    if (message.content.match(prefixMention)) {
        return handleResponseToMessage(client, message, false, true, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setTitle("Prefix")
                    .setDescription(`The current bot prefix on this server is \`${settings.prefix}\`.`),
            ],
        });
    }

    // If the member on a guild is invisible or not cached, fetch them.
    if (message.guild && !message.member) {
        await message.guild.members.fetch(message.author);
    }

    const commands = flattenArray([...client.bahamut.cmdHandler.commandHandler.commands].map(([key]) => key));
    if (!message.content.startsWith(settings.prefix) && !commands.includes(message.content.split(" ")[0].replace(settings.prefix, ""))) {
        await client.bahamut.levelSystem.handleNewUserMessage(message, message.member!);
    }
};
