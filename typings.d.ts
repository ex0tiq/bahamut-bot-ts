import Discord from "discord.js";
import UplinkAPIHandler from "./src/modules/UplinkAPIHandler.js";
import BahamutShardingManager from "./src/modules/BahamutShardingManager.js";
import { Track } from "erela.js";
import { CommandObject, CommandUsage } from "wokcommands";
import BahamutClient from "./src/modules/BahamutClient";

export interface StartupMessage {
    type: string | null;
    data: StartupMessageData;
}

export interface StartupMessageData {
    shardId: number;
    conf: BootConfig
}

export interface BootManager {
    shardReady: boolean;
    startTime: number;
    config: BotStaticConfig;
    apiConfig: BotAPIConfig;
}

export interface BahamutShardingBootManager extends BahamutShardingManager, BootManager {
    uplinkApiHandler: UplinkAPIHandler;
}

export interface BootConfig {
    admins: string[];
    avatar_link: string;
    cookie_images: {
        [key: string]: string;
    };
    emoji_icons: {
        [key: string]: string;
    };
    error_message_color: string;
    ffxiv_settings: {
        [key: string]: string;
    };
    game_icons: {
        [key: string]: string;
    };
    genius_token: string;
    invite_link: string;
    job_emoji_list: {
        jobs: {
            [key: string]: string;
        };
        dsh: {
            [key: string]: string;
        };
        dsl: {
            [key: string]: string;
        }
    };
    lavalink_settings: {
        nodes: LavalinkNode[]
    };
    level_up_images: {
        [key: string]: string;
    };
    message_icons: {
        [key: string]: string;
    };
    owner_id: string;
    patreon_link: string;
    premium_settings: {
        management_guild: string;
        roles: {
            [key: string]: number;
        }
    };
    primary_message_color: string;
    reddit: RedditSettings;
    spotify_client_id: string;
    spotify_client_secret: string;
    status_emojis: {
        [key: string]: string;
    };
    stuff_icons: {
        [key: string]: string;
    };
    tenor_token: string;
    tmdb_token: string;
    token: string;
    total_shards: string;
    website_link: string;
    xivapi_token: string;
    config_types: {
        [key: string]: string;
    };
    defaultSettings: GuildSettings
}

export interface BotConfig extends BotStaticConfig, BootConfig {}

export interface BotStaticConfig {
    uplink_api_url: string;
    uplink_api_register_token: string;
    uplink_api_allowed_ips: string[];
    uplink_api_server_location: string;
    uplink_api_serverId: string;
    db : BotStaticDBConfig;
    command_categories: {
        [key: string]: string;
    };
}

export interface BotAPIConfig {
    api_port: number;
    api_keys: string[];
}

export interface BotStaticDBConfig {
    host: string;
    user: string;
    pass: string;
    database: string;
}

export interface LavalinkNode {
    host: string;
    password: string;
    port: number;
}

export interface RadioStation {
    name: string;
    icon: string;
    stream_url: string;
    website_url: string;
    tracklist: string;
    music_types: string;
}

export interface ExtendedTrack extends Track {
    website_url?; string;
    tracklist?: string;
    title?: string;
}

export interface RedditSettings {
    userAgent: string;
    appid: string;
    secret: string;
    refreshToken: string;
}

export type FileData = {
    filePath: string;
    fileContents: any;
};

export interface CommandConfig extends Omit<CommandObject, "callback"> {
    category: string;
}

export interface BahamutCommandUsage extends CommandUsage {
    client: BahamutClient
}

export interface LevelConfig {
    xp_per_message_very_low: number;
    xp_per_message_low: number;
    xp_per_message_mid: number;
    xp_per_message_high: number;
    xp_per_message_very_high: number;
    rank_name_very_low: string;
    rank_name_low: string;
    rank_name_mid: string;
    rank_name_high: string;
    rank_name_very_high: string;
    rank_name_max: string;
    levels: {
        [key: string]: number
    }
}

export interface GuildSettings {
    prefix: string;
    timezone: string | null;
    time_format_24h: boolean;
    language: string;
    disabled_categories: string[];
    disabled_commands: string[];
    premium_user: string | null;
    admin_roles: string[];
    mod_roles: string[];
    mod_only_invites: boolean;
    mod_audit_log_channel: string | null;
    mod_audit_log_categories: string[];
    spam_ignore_bots: boolean;
    spam_log_audit: boolean;
    spam_bad_words_check: boolean;
    // 0 = deactivated; 1 = delete message; 2 = warn user; 3 = warn user & delete message
    spam_bad_words_action: number;
    spam_bad_words_own_words: string[];
    spam_bad_words_ignored_channels: string[];
    spam_bad_words_ignored_roles: string[];
    spam_repeated_messages_check: boolean;
    spam_repeated_messages_action: number;
    spam_repeated_messages_ignored_channels: string[];
    spam_repeated_messages_ignored_roles: string[];
    spam_invites_check: boolean;
    spam_invites_action: number;
    spam_invites_ignored_channels: string[];
    spam_invites_ignored_roles: string[];
    spam_links_check: boolean;
    spam_links_action: number;
    spam_links_ignore_discord: boolean;
    spam_links_allowed_domains: string[];
    spam_links_ignored_channels: string[];
    spam_links_ignored_roles: string[];
    spam_caps_check: boolean;
    spam_caps_action: number;
    spam_caps_ignored_channels: string[];
    spam_caps_ignored_roles: string[];
    spam_emotes_check: boolean;
    spam_emotes_action: number;
    spam_emotes_threshold: number;
    spam_emotes_ignored_channels: string[];
    spam_emotes_ignored_roles: string[];
    spam_spoilers_check: boolean;
    spam_spoilers_action: number;
    spam_spoilers_threshold: number;
    spam_spoilers_ignored_channels: string[];
    spam_spoilers_ignored_roles: string[];
    spam_mentions_check: boolean;
    spam_mentions_action: number;
    spam_mentions_threshold: number;
    spam_mentions_ignored_channels: string[];
    spam_mentions_ignored_roles: string[];
    spam_zalgo_check: boolean;
    spam_zalgo_action: number;
    spam_zalgo_ignored_channels: string[];
    spam_zalgo_ignored_roles: string[];
    // Map containing all restricted channels
    // { '1234544': { allow_commands: true; allow_images: true; allow_videos: true } }
    restricted_channels: object;
    // Send a DM to the author on delete
    restricted_channels_send_dm: boolean;
    // Send a reply in channel on delete
    restricted_channels_send_reply: boolean;
    welcome_channel: string | null;
    welcome_message: string;
    welcome_enabled: boolean;
    welcome_image_enabled: boolean;
    character_verify_update_name: boolean;
    character_verify_server_role: boolean;
    character_verify_server_role_create: boolean;
    character_verify_dc_role: boolean;
    character_verify_dc_role_create: boolean;
    character_verify_roles: string[];
    character_verify_achievement_roles_enabled: boolean;
    // Custom Object TODO
    character_verify_achievement_roles: Map<string, Discord.Role>;
    character_verify_auto_del_msg: boolean;
    ffxiv_lodestone_news_channel: string | null;
    ffxiv_fashion_report_channel: string | null;
    music_volume: number;
    music_autoplay: boolean;
    music_dj_role: string | null;
    music_channels: string[];
    music_leave_on_empty: boolean;
    user_levels: boolean;
    // Custom Object TODO
    user_level_roles: Map<number, Discord.Role>;
    user_level_roles_replace: boolean;
    user_level_included_channels: string[];
    auto_delete_messages_timeout: number;
    auto_delete_command_trigger: boolean;
    twitch_notify_channel: string | null;
    twitch_notify_text: string;
    twitch_notify_role: string | null;
    twitch_subscriptions: string[];
}

export interface GuildPremiumRole {
    id: string
    name: string;
}

export interface BahamutGuild extends Discord.Guild {
    premium: boolean | null;
    modOnly: boolean | null;
}

export interface UserGuild {
    id: string;
    name: string;
    icon: string;
    acronym: string;
    modOnly: boolean;
    premium: boolean;
}

export interface HandleMessageOptions {
    content?: string,
    files?: any[],
    embeds?: Discord.EmbedBuilder[]
}

export interface MessageDeleteOptions {
    deleteInitMessage: {
        enabled: true;
        deleteAfter: number;
    };
    deleteResponseMessage: {
        enabled: true;
        deleteAfter: number;
    }
}