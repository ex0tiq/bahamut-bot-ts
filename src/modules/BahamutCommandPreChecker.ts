// Class to combine pre checks for commands

import {CommandConfig} from "../../typings";
import {CommandUsage} from "wokcommands";
import BahamutClient from "./BahamutClient";
import {
    createMissingParamsErrorResponse,
    createMissingPermErrorResponse,
    handleErrorResponseToMessage
} from "../lib/messageHandlers";
import {getGuildSettings} from "../lib/getFunctions";

export class BahamutCommandPreChecker {
    // Bahamut Client
    private _client: BahamutClient;
    // Instance of all command params
    private _command: Partial<CommandUsage>;
    // Command config for this PreChecker instance
    private _commandConf: CommandConfig;
    // Defined pre checks
    private _preChecks: PreCheck[];

    constructor(client: BahamutClient, command: Partial<CommandUsage>, commandConf: CommandConfig, preChecks: PreCheck[]) {
        this._client = client;
        this._command = command;
        this._commandConf = commandConf;
        this._preChecks = preChecks;
    }

    /**
     * True on error, False if not
     */
    runChecks = async() => {
        const settings = await getGuildSettings(this._client, this._command.channel!.guild);
        let error: boolean = false;

        for (const check of this._preChecks) {
            if (check.type === PreCheckType.BOT_HAS_PERMISSIONS) {
                for (const perm of check.requiredPermissions!) {
                    if (!(this.botHasPerm(perm.bitField))) {
                        error = true;
                        await handleErrorResponseToMessage(
                            this._client,
                            this._command.message || this._command.interaction,
                            false,
                            this._commandConf.deferReply,
                            createMissingPermErrorResponse(this._client, perm.name)
                        );
                    }

                    if (error) break;
                }
            } else if (check.type == PreCheckType.GUILD_IS_PREMIUM) {
                if (!settings.premium_user) {
                    error = true;
                    await handleErrorResponseToMessage(
                        this._client,
                        this._command.message || this._command.interaction,
                        false,
                        this._commandConf.deferReply,
                        await this._client.bahamut.premiumHandler.getGuildNotPremiumMessage(check.customErrorMessage)
                    );
                }
            } else if (check.type === PreCheckType.USER_IS_DJ) {
                if (!(await this._client.bahamut.musicHandler.userHasDJRights(this._command.member!, this._command.channel!.guild))) {
                    error = true;
                    await handleErrorResponseToMessage(
                        this._client,
                        this._command.message || this._command.interaction,
                        false,
                        this._commandConf.deferReply,
                        check.customErrorMessage ? check.customErrorMessage : this._client.bahamut.musicHandler.getUserNoDJPermMessage()
                    );
                }
            } else if (check.type === PreCheckType.CHANNEl_IS_MUSIC_CHANNEL) {
                if (!(await this._client.bahamut.musicHandler.isChannelMusicChannel(this._command.channel!))) {
                    error = true;
                    await handleErrorResponseToMessage(
                        this._client,
                        this._command.message || this._command.interaction, false,
                        this._commandConf.deferReply,
                        check.customErrorMessage ? check.customErrorMessage : await this._client.bahamut.musicHandler.getChannelNotMusicChannelMessage(this._command.message)
                    );
                }
            } else if (check.type === PreCheckType.USER_IN_VOICE_CHANNEL) {
                if (!(this._client.bahamut.musicHandler.isUserInVoiceChannel(this._command.member!))) {
                    error = true;
                    await handleErrorResponseToMessage(
                        this._client,
                        this._command.message || this._command.interaction,
                        false,
                        this._commandConf.deferReply,
                        check.customErrorMessage ? check.customErrorMessage : 'You\'re not in a voice channel!'
                    );
                }
            } else if (check.type === PreCheckType.USER_IN_SAME_VOICE_CHANNEL_AS_BOT) {
                if (!(this._client.bahamut.musicHandler.isUserInSameVoiceChannelAsBot(this._command.channel!.guild, this._command.member!))) {
                    error = true;
                    await handleErrorResponseToMessage(
                        this._client,
                        this._command.message || this._command.interaction,
                        false,
                        this._commandConf.deferReply,
                        check.customErrorMessage ? check.customErrorMessage : 'You\'re not in the same voice channel as the bot!'
                    );
                }
            } else if (check.type === PreCheckType.MUSIC_NODES_AVAILABLE) {
                if (!(this._client.bahamut.musicHandler.manager.leastUsedNodes.first())) {
                    error = true;
                    await handleErrorResponseToMessage(
                        this._client,
                        this._command.message || this._command.interaction,
                        false,
                        this._commandConf.deferReply,
                        check.customErrorMessage ? check.customErrorMessage : 'There are no music nodes available. Please try again later.'
                    );
                }
            } else if (check.type === PreCheckType.ALL_PARAMS_PROVIDED) {
                if (!check.paramsCheck) {
                    error = true;
                    await handleErrorResponseToMessage(
                        this._client,
                        this._command.message || this._command.interaction,
                        false, this._commandConf.deferReply,
                        createMissingParamsErrorResponse(this._client, this._commandConf)
                    );
                }
            }

            if (error) return error;
        }

        return error;
    }

    private botHasPerm = (perm: bigint) => {
        return this._command.channel!.guild.members.me!.permissions.has(perm);
    }
}

export interface PreCheck {
    type: PreCheckType,
    customErrorMessage?: string,
    requiredPermissions?: UserPermission[],
    paramsCheck?: boolean
}

export interface UserPermission {
    name: string,
    bitField: bigint
}

export enum PreCheckType {
    BOT_HAS_PERMISSIONS = "BOT_HAS_PERMISSIONS",
    GUILD_IS_PREMIUM = "GUILD_IS_PREMIUM",
    USER_IS_DJ = "USER_IS_DJ",
    CHANNEl_IS_MUSIC_CHANNEL = "CHANNEL_IS_MUSIC_CHANNEL",
    USER_IN_VOICE_CHANNEL = "USER_IN_VOICE_CHANNEL",
    USER_IN_SAME_VOICE_CHANNEL_AS_BOT = "USER_IN_SAME_VOICE_CHANNEL_AS_BOT",
    MUSIC_NODES_AVAILABLE = "MUSIC_NODES_AVAILABLE",
    ALL_PARAMS_PROVIDED = "ALL_PARAMS_PROVIDED"
}