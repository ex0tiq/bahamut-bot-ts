import Discord from "discord.js";
import { CommandConfig } from "../../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../../modules/BahamutClient";
import { getGuildSettings } from "../../../lib/getFunctions";
import { createMissingParamsErrorResponse, handleErrorResponseToMessage } from "../../../lib/messageHandlers";
import { createPortraitImage } from "../../../lib/canvasFunctions";
import { resolveUser } from "../../../lib/resolveFunctions";
// Non ES imports
const XIVAPI = require("@xivapi/js");

const config: CommandConfig = {
    name: "portrait",
    type: CommandType.LEGACY,
    description: "Get a portrait of your or somebody else's current ffxiv character.",
    expectedArgs: "[user]",
    options: [
        {
            name: "user",
            description: "Optional user.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    category: "FFXIV",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, args, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        const xiv = new XIVAPI({
            private_key: client.bahamut.config.xivapi_token,
            language: settings.language,
        });

        let ffCharId = null, ffChar = null, target;

        if (args.length > 0) {
            if (message && message.mentions.members!.size > 0) {
                ffCharId = message.mentions.members?.first();
            } else if (!message && args.length > 0) {
                if (args[0] instanceof Discord.GuildMember) {
                    ffCharId = args[0];
                } else {
                    ffCharId = await resolveUser(client, args[0], channel.guild);
                }
            } else {
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));
            }

            if (!ffCharId) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));

            target = ffCharId;
        } else {
            target = member;
        }

        ffCharId = await client.bahamut.dbHandler.ffxiv.getDBGuildFFXIVCharacterID(channel.guild, target);

        // Check if user has a linked ffxiv character
        if (!(ffCharId)) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, `There is no FFXIV character registered for ${target}.`);

        try {
            ffChar = await xiv.character.get(ffCharId);
        } catch (err) {
            console.error("Error fetching user avatar:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
        }
        if (ffChar.Error) {
            console.error("Error fetching user avatar:", ffChar.Error);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
        }

        if (ffChar.Character && ffChar.Character.Portrait) {
            try {
                const captionImage = await createPortraitImage({
                    title: ffChar.Character.Name,
                    subtitle: `${ffChar.Character.Server}`,
                    source: ffChar.Character.Portrait,
                    decorateCaptionFillStyle: "rgba(0, 0, 0, 0.5)",
                    offsetTitleY: -20,
                    offsetSubtitleY: 30,
                });

                if (!captionImage) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");

                return { files: [(new Discord.AttachmentBuilder(captionImage, { name: "portrait.png" }))] };
            } catch (err) {
                console.error("Error fetching user avatar:", err);
                return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
            }
        } else {
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An error occurred while doing that. Please try again later.");
        }
    },
};