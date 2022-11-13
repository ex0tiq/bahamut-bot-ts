import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";
import { isUserModOfGuild } from "../../lib/checkFunctions";
import { handleErrorResponseToMessage } from "../../lib/messageHandlers";
import { DateTime } from "luxon";

const config: CommandConfig = {
    name: "invite",
    aliases: ["inv"],
    type: CommandType.LEGACY,
    testOnly: false,
    description: "Create an invite link for this discord server.",
    category: "Miscellaneous",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("miscellaneous")) return;

        const maxAge = 86400;

        if (settings.mod_only_invites && !(await isUserModOfGuild(client, message.member!, channel.guild))) return handleErrorResponseToMessage(client, message, false, config.deferReply, "You don't have permission to create invites for this server.");
        // Run command pre checks
        const checks = new BahamutCommandPreChecker(client, { client, message, channel }, config, [
            {
                type: PreCheckType.BOT_HAS_PERMISSIONS, requiredPermissions: [
                    { bitField: Discord.PermissionFlagsBits.CreateInstantInvite, name: "CREATE_INSTANT_INVITE" },
                ], customErrorMessage: "I don't have permissions to create invites for this server.",
            },
        ]);
        if (await checks.runChecks()) return;

        const invite = await channel.createInvite({
            maxAge: maxAge,
            reason: "Invite command",
        });

        const formattedInviteTimestamp = DateTime.fromMillis(invite.createdTimestamp!).plus({ seconds: invite.maxAge! }).toFormat(`${settings.time_format_24h ? "dd.LL.yyyy" : "LL/dd/yyyy"} ${settings.time_format_24h ? "HH" : "hh"}:mm:ss`);

        return `This invite is valid until \`${formattedInviteTimestamp}\`.\n\n${invite.url}`;
    },
};