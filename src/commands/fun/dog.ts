import { fileIsVideo } from "../../lib/validateFunctions.js";
import axios from "axios";
import { CommandConfig } from "../../../typings.js";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers.js";

const config: CommandConfig = {
    name: "dog",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Get a random dog image or video.",
    category: "Fun (/fun)",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
        try {
            const { data: json } = await axios.get("https://dog.ceo/api/breeds/image/random");
            let image = null;

            if (!json || typeof json !== "object") return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Unable to fetch an appropriate image. Please try again later.");
            if (json.message && json.status === "success") image = json.message;
            else return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while fetching an appropriate image. Please try again later.");

            if (fileIsVideo(image)) {
                return image;
            } else {
                return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setAuthor({ name: "Dog", iconURL: client.bahamut.config.emoji_icons.dog })
                            .setImage(image),
                    ],
                });
            }
        } catch(err) {
            console.error("Error while getting dog image:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while fetching an appropriate image. Please try again later.");
        }
    },
};