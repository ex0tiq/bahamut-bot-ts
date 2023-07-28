import BahamutClient from "../../modules/BahamutClient.js";
import Discord from "discord.js";
import { GuildSettings } from "../../../typings.js";
import { getGuildSettings } from "../getFunctions.js";

export default class RestrictedChannels {
    private client: BahamutClient;
    private guild: Discord.Guild;
    private message: Discord.Message;
    private guild_settings?: GuildSettings;
    private deleteMessage: boolean;
    private warnUser: boolean;

    constructor(client: BahamutClient, guild: Discord.Guild, message: Discord.Message) {
        this.client = client;
        this.guild = guild;
        this.message = message;

        this.deleteMessage = false;
        this.warnUser = false;
    }

    runRestrictChecks = async () => {
        // Abort checks if message is from bot self
        if (this.message.author.id === this.client.user!.id) return;

        this.guild_settings = await getGuildSettings(this.client, this.guild);

        if (!(Object.prototype.hasOwnProperty.call(this.guild_settings.restricted_channels, this.message.channel.id))) return;

        // @ts-ignore
        const options = this.guild_settings.restricted_channels[this.message.channel.id];

        if (options && options.allow_commands) {
            // todo
        }
        if (options && options.allow_images) {
            // todo
        }
        if (options && options.allow_videos) {
            // todo
        }

        return true;
    };
}