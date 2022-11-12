import { CommandConfig } from "../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import Discord from "discord.js";
import Canvacord from "canvacord";
import { getCurrentUserData, getXpForLevel } from "../../lib/levelFunctions";
import BahamutClient from "../../modules/BahamutClient";
import { getGuildSettings } from "../../lib/getFunctions";
import { resolveUser } from "../../lib/resolveFunctions";
import moment from "moment";
import { resolve } from "path";
import { promises as fs } from "fs";
import { handleResponseToMessage } from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "profile",
    type: CommandType.BOTH,
    description: "Get infos about a user",
    expectedArgs: "[user]",
    options: [
        {
            name: "user",
            description: "User to query information for",
            type: ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    maxArgs: 1,
    category: "Users",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, args: any[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("users")) return;

        const sendOptions: {
            files: Discord.AttachmentBuilder[]
        } = {
            files: [],
        };

        let target;

        if (args.length > 0) {
            if (message && message.mentions.members!.size > 0) {
                target = message.mentions.members?.first();
            }
            else if (!message && args.length > 0) {
                if (args[0] instanceof Discord.GuildMember) {
                    target = args[0];
                }
                else {
                    target = await resolveUser(client, args[0], channel.guild);
                }
            }
            else {
                target = member;
            }
        }
        else {
            target = member;
        }

        const [userData, userCookies] = await Promise.all([
            getCurrentUserData(client, target!, true),
            client.bahamut.dbHandler.cookie.getDBUserCookies(channel.guild, target!),
        ]),
            userCreatedDate = moment(target!.user.createdTimestamp),
            userJoinedDate = moment(target!.joinedTimestamp),
            avatarUrl = target!.avatarURL({ forceStatic: true, extension: "png" }),
            profileCard = new Canvacord.Rank();
        let rank = null, xpNeeded = 0, uStats;

        const msg = new Discord.EmbedBuilder()
                    .setAuthor({ name: target!.displayName })
                    .setThumbnail(((avatarUrl) ? avatarUrl : target!.user.defaultAvatarURL));

        if (settings.user_levels) {
            xpNeeded = await getXpForLevel(client, userData.level + 1);
            if (userData.level <= 30) {
                rank = {
                    name: client.bahamut.levelSystem.levelConfig.rank_name_very_low,
                    level: 0,
                };
            }
            else if (userData.level <= 60) {
                rank = {
                    name: client.bahamut.levelSystem.levelConfig.rank_name_low,
                    level: 1,
                };
            }
            else if (userData.level <= 90) {
                rank = {
                    name: client.bahamut.levelSystem.levelConfig.rank_name_mid,
                    level: 2,
                };
            }
            else if (userData.level <= 120) {
                rank = {
                    name: client.bahamut.levelSystem.levelConfig.rank_name_high,
                    level: 3,
                };
            }
            else if (userData.level === 150) {
                rank = {
                    name: client.bahamut.levelSystem.levelConfig.rank_name_max,
                    level: 5,
                };
                userData.xp = client.bahamut.levelSystem.levelConfig.levels[150];
                xpNeeded = userData.xp;
            }
            else {
                rank = {
                    name: client.bahamut.levelSystem.levelConfig.rank_name_very_high,
                    level: 4,
                };
            }

            profileCard.setAvatar((avatarUrl) ? avatarUrl : target!.user.defaultAvatarURL);
            profileCard.setProgressBar([client.bahamut.config.primary_message_color, client.bahamut.config.error_message_color], "GRADIENT");
            profileCard.setCurrentXP(userData.xp);
            profileCard.setRequiredXP(xpNeeded);
            profileCard.setUsername(target!.displayName);
            profileCard.setLevel(userData.level);
            profileCard.setDiscriminator(target!.user.discriminator);
            profileCard.setBackground("IMAGE", await fs.readFile(resolve("assets/img/cards/bot_card_background.jpg")));

            msg.addFields({ name: "Level", value: `**${userData.level}** ${((userData.level === 150) ? "(Max)" : (`(${userData.xp}/${await getXpForLevel(client, userData.level + 1)} XP)`))}`, inline: true });
            // @ts-ignore
            msg.addFields({ name: "Title", value: (rank.name ? rank.name : "Not ranked"), inline: true });

            if (rank.name && rank.level >= 0) {
                profileCard.setRank(rank.level, rank.name);
            }

            sendOptions["files"] = [(new Discord.AttachmentBuilder((await profileCard.build()), { name: "profile.png" }))];
            msg.setImage("attachment://profile.png");
        }

        if (uStats && typeof uStats["cookies"] !== "undefined") {
            // eslint-disable-next-line
            msg.addFields({ name: "Cookies", value: `\:cookie: ${userCookies}`, inline: false });
        }
        else {
            // eslint-disable-next-line
            msg.addFields({ name: "Cookies", value: "\:cookie: 0", inline: false });
        }

        msg.addFields({ name: "Joined On", value: `${userJoinedDate.format("DD MMM YYYY")} (${userJoinedDate.fromNow()})`, inline: false });
        msg.addFields({ name: "Created On", value: `${userCreatedDate.format("DD MMM YYYY")} (${userCreatedDate.fromNow()})`, inline: false });

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, { ...sendOptions, embeds: [msg] });
    },
};