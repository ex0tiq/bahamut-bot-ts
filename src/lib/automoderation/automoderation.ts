import getUrls from "get-urls";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../getFunctions";
import { GuildSettings } from "../../../typings";
// Non ES imports
const emojiAware = require("emoji-aware").onlyEmoji;

export default class AutoModeration {
    private client: BahamutClient;
    private guild: Discord.Guild;
    private message: Discord.Message;
    private guild_settings?: GuildSettings;
    private repeated_messages = {};
    private deleteMessage: boolean;
    private warnUser: boolean;

    static default_bad_words = require("../../../assets/default_badWords.json");

    constructor(client: BahamutClient, guild: Discord.Guild, message: Discord.Message) {
        this.client = client;
        this.guild = guild;
        this.message = message;

        this.deleteMessage = false;
        this.warnUser = false;
    }

    public runAutoModChecks = async () => {
        // Abort checks if message is from bot self
        if (this.message.author.id === this.client.user!.id) return;

        this.guild_settings = await getGuildSettings(this.client, this.guild);

        // Abort checks if message author is bot and ignore bots is set to true
        if (this.guild_settings.spam_ignore_bots && this.message.author.bot) return;

        let temp = null;
        // Return values:
        // 0 = do nothing
        // 1 = delete
        // 2 = warn
        // 3 = delete and warn
        if (this.guild_settings.spam_bad_words_check) {
            if ((temp = await this.badWordsCheck())) {
                return this.handleCheckResult("bad_words", temp);
            }
        }
        if (this.guild_settings.spam_repeated_messages_check) {
            if ((temp = await this.repeatedMessageChecks())) {
                return this.handleCheckResult("repeated_messages", temp);
            }
        }
        if (this.guild_settings.spam_invites_check) {
            if ((temp = await this.invitesCheck())) {
                return this.handleCheckResult("invites", temp);
            }
        }
        if (this.guild_settings.spam_links_check) {
            if ((temp = await this.linksCheck())) {
                return this.handleCheckResult("links", temp);
            }
        }
        if (this.guild_settings.spam_caps_check) {
            if ((temp = await this.CAPSCheck())) {
                return this.handleCheckResult("caps", temp);
            }
        }
        if (this.guild_settings.spam_emotes_check) {
            if ((temp = await this.emotesCheck())) {
                return this.handleCheckResult("emotes", temp);
            }
        }
        if (this.guild_settings.spam_spoilers_check) {
            if ((temp = await this.spoilersCheck())) {
                return this.handleCheckResult("spoilers", temp);
            }
        }
        if (this.guild_settings.spam_mentions_check) {
            if ((temp = await this.mentionsCheck())) {
                return this.handleCheckResult("mentions", temp);
            }
        }
        if (this.guild_settings.spam_zalgo_check) {
            if ((temp = await this.zalgoCheck())) {
                return this.handleCheckResult("zalgo", temp);
            }
        }

        // Execute needed actions
        return this.handleMessageActions();
    };

    private badWordsCheck = async () => {
        if (this.guild_settings!.spam_bad_words_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_bad_words_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_bad_words_ignored_channels.includes(this.message.channel.id)) return false;

        const words = this.message.content.split(" "),
            bad_words = [...AutoModeration.default_bad_words, ...this.guild_settings!.spam_bad_words_own_words];

        for (const w of words) {
            if (bad_words.includes(w.toLowerCase())) return true;
        }

        return false;
    };

    private repeatedMessageChecks = async () => {
        if (this.guild_settings!.spam_repeated_messages_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_repeated_messages_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_repeated_messages_ignored_channels.includes(this.message.channel.id)) return false;

        if (this.message.channel.messages.cache.size === 0) return false;

        const startCheckTimestamp = this.message.channel.messages.cache.last()!.createdTimestamp - 30000,
            // @ts-ignore
            duplicateMessages = this.message.channel.messages.cache.filter((msg: Discord.Message) => (
                msg.author.id === this.message.author.id
                && msg.createdTimestamp >= startCheckTimestamp
                && msg.content.trim().toLowerCase() === this.message.content.trim().toLowerCase()));

        // Same message > 3x in last 30 seconds -> true
        return duplicateMessages.size > 3;
    };

    private invitesCheck = async () => {
        if (this.guild_settings!.spam_invites_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_invites_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_invites_ignored_channels.includes(this.message.channel.id)) return false;

        return this.message.content.includes("discord.gg/" || "discordapp.com/invite/" || "discord.com/invite/");
    };

    private linksCheck = async () => {
        if (this.guild_settings!.spam_links_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_links_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_links_ignored_channels.includes(this.message.channel.id)) return false;

        const urls = getUrls(this.message.content);
        let linkCount = 0;

        for (const u of urls) {
            const url = new URL(u);
            let inc = false;

            if (!this.guild_settings!.spam_links_allowed_domains.includes(url.hostname.toLowerCase())) {
                inc = true;
            }
            if (this.guild_settings!.spam_links_ignore_discord && ["discord.gg", "discordapp.com", "discord.com"].includes(url.hostname.toLowerCase())) {
                inc = false;
            }

            if (inc) linkCount++;
        }

        return linkCount > 0;
    };

    private CAPSCheck = async () => {
        if (this.guild_settings!.spam_caps_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_caps_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_invites_ignored_channels.includes(this.message.channel.id)) return false;

        return ((this.message.content.replace(/[^A-Z]/g, "").length / this.message.content.length) * 100) >= 50;
    };

    private emotesCheck = async () => {
        if (this.guild_settings!.spam_emotes_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_emotes_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_emotes_ignored_channels.includes(this.message.channel.id)) return false;

        const discordMatches = this.message.content.match(/<a?:.+?:\d+>/g) || [],
            unicodeMatches = emojiAware(this.message.content) || [],
            combinedMatches = discordMatches.length + unicodeMatches.length;

        return combinedMatches > this.guild_settings!.spam_emotes_threshold;
    };

    private spoilersCheck = async () => {
        if (this.guild_settings!.spam_spoilers_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_spoilers_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_spoilers_ignored_channels.includes(this.message.channel.id)) return false;

        const matches = this.message.content.match(/\|\|.+?\|\|/g) || [];

        if (matches && matches.length > this.guild_settings!.spam_spoilers_threshold) {
            return true;
        }
        return false;
    };

    private mentionsCheck = async () => {
        if (this.guild_settings!.spam_mentions_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_mentions_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_mentions_ignored_channels.includes(this.message.channel.id)) return false;

        const matches = this.message.content.match(/<@!.+?>/g) || [];

        return matches && matches.length > this.guild_settings!.spam_mentions_threshold;
    };

    private zalgoCheck = async () => {
        if (this.guild_settings!.spam_zalgo_ignored_roles.length > 0 &&
            this.message.guild!.roles.cache.some(role => this.guild_settings!.spam_zalgo_ignored_roles.includes(role.id))) return false;
        if (this.guild_settings!.spam_zalgo_ignored_channels.includes(this.message.channel.id)) return false;

        if (this.message.content.match(/[^\u+0300-\u+036F]/g)) {
            return true;
        }
        return false;
    };

    private handleCheckResult = async (check: string, result: boolean) => {
        if (!result) return;

        let action = 0;

        if (check === "bad_words") action = this.guild_settings!.spam_bad_words_action;
        else if (check === "repeated_messages") action = this.guild_settings!.spam_repeated_messages_action;
        else if (check === "invites") action = this.guild_settings!.spam_invites_action;
        else if (check === "links") action = this.guild_settings!.spam_links_action;
        else if (check === "caps") action = this.guild_settings!.spam_caps_action;
        else if (check === "emotes") action = this.guild_settings!.spam_emotes_action;
        else if (check === "spoilers") action = this.guild_settings!.spam_spoilers_action;
        else if (check === "mentions") action = this.guild_settings!.spam_mentions_action;
        else if (check === "zalgo") action = this.guild_settings!.spam_zalgo_action;

        switch (action) {
            case 1: this.deleteMessage = true; break;
            case 2: this.warnUser = true; break;
            case 3: this.deleteMessage = true; this.warnUser = true;
                break;
            default: break;
        }

        await this.handleMessageActions();
    };

    private handleMessageActions = async () => {
        if (this.warnUser) {
            // Todo
        }
        if (this.deleteMessage) {
            await this.message.delete();
            return true;
        }

        // Todo: send audit log message
    };
}

