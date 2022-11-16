import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../modules/BahamutClient";
import Discord from "discord.js";
import {
    createMissingParamsErrorResponse,
    createSuccessResponse,
    handleResponseToMessage,
} from "../lib/messageHandlers";
import { getGuildSettings } from "../lib/getFunctions";
import { resolveUser } from "../lib/resolveFunctions";
import { CommandConfig } from "../../typings";

const config: CommandConfig = {
    name: "premium",
    aliases: ["shard"],
    type: CommandType.BOTH,
    description: "Premium status and enable/disable for current server",
    maxArgs: 1,
    expectedArgs: "[details/status/enable/disable]",
    options: [
        {
            name: "option",
            description: "Configure premium options.",
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
            choices: [
                {
                    name: "Details",
                    value: "details",
                },
                {
                    name: "Status",
                    value: "status",
                },
                {
                    name: "Enable",
                    value: "enable",
                },
                {
                    name: "Disable",
                    value: "disable",
                },
            ],
        },
    ],
    category: "System",
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
    callback: async ({ client, args, message, channel, member, interaction }: { client: BahamutClient, args: string[], message: Discord.Message, channel: Discord.GuildTextBasedChannel, member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        let embed;

        if (args.length <= 0) {
            embed = await getServerPremiumStatus(client, channel.guild);
        } else if (args.length === 1) {
            switch (args[0].toLowerCase()) {
                case "details":
                    embed = await getUserPremiumDetails(client, member);
                    break;
                case "status":
                    embed = await getServerPremiumStatus(client, channel.guild);
                    break;
                case "enable":
                    // Enable premium for this server
                    embed = await client.bahamut.premiumHandler.enableGuildPremium(channel.guild, member);
                    break;
                case "disable":
                    // Disable premium for this server
                    embed = await client.bahamut.premiumHandler.disableGuildPremium(channel.guild, member);
                    break;
                default:
                    embed = createMissingParamsErrorResponse(client, config);
                    break;
            }
        } else {
            embed = createMissingParamsErrorResponse(client, config);
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, embed);
    },
};

const getUserPremiumDetails = async (client: BahamutClient, user: Discord.GuildMember) => {
    const servers = await client.bahamut.premiumHandler.getUserPremiumServers(user) || [],
        maxSlots = await client.bahamut.premiumHandler.getUserMaxPremiumServers(user);
    let serverString = "", i = 1;

    for (const srv of servers) {
        serverString += `\`${i}\` ${srv.name}\n`;
        i++;
    }

    return createSuccessResponse(client, {
        embeds: [
            new Discord.EmbedBuilder()
                .setTitle(`<:heart:${client.bahamut.config.status_emojis.heart}> Premium`)
                .setDescription(`You have used \`${servers.length}\` of \`${(maxSlots === -1 ? "∞" : maxSlots)}\` available slots for your current premium tier.\n\n${serverString}`),
        ],
    });
};

const getServerPremiumStatus = async (client: BahamutClient, guild: Discord.Guild) => {
    const settings = await getGuildSettings(client, guild);

    if (settings.premium_user) {
        const user = await resolveUser(client, settings.premium_user, guild);
        if (user) {
            return createSuccessResponse(client, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle(`<:heart:${client.bahamut.config.status_emojis.heart}> Premium`)
                        .setDescription(`Premium features for this server are currently \`enabled\` by ${user}!`),
                ],
            });
        } else {
            // Disable premium features if user not found
            return createSuccessResponse(client, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle(`<:heart:${client.bahamut.config.status_emojis.heart}> Premium`)
                        .setDescription("Premium features for this server are currently `disabled`!"),
                ],
            });
        }
    } else {
        return createSuccessResponse(client, {
            embeds: [
                new Discord.EmbedBuilder()
                    .setTitle(`<:heart:${client.bahamut.config.status_emojis.heart}> Premium`)
                    .setDescription("Premium features for this server are currently `disabled`!"),
            ],
        });
    }
};
