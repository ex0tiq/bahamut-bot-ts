import { CommandConfig } from "../../../typings";
import Hangman from "../../lib/game_classes/hangman";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { handleErrorResponseToMessage } from "../../lib/messageHandlers";
import { getGuildSettings } from "../../lib/getFunctions";

const config: CommandConfig = {
    name: "hangman",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Play a round of hangman.",
    minArgs: 0,
    expectedArgs: "[stop]",
    category: "Games",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, interaction, member }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], interaction: Discord.CommandInteraction, member: Discord.GuildMember }) => {
        if (client.bahamut.runningGames.has(channel.id)) {
            if (args.length === 1 && args[0].toLowerCase() === "stop") {
                client.bahamut.runningGames.get(channel.id)!.obj.stopGame();
                client.bahamut.runningGames.delete(channel.id);
                return;
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is already a running game in this channel. Please finish it before starting a new one.");
            }
        }

        const settings = await getGuildSettings(client, channel.guild);

        client.bahamut.runningGames.set(channel.id, {
            "type": "hangman",
            "initiator": member,
            "obj": new Hangman(client.bahamut, channel, settings),
        });
        client.bahamut.runningGames.get(channel.id)!.obj.newGame();
    },
};