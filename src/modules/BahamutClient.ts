import Discord from "discord.js";
import { Bahamut } from "../bahamut.js";

export default class BahamutClient extends Discord.Client {
    // Bahamut parent class
    private readonly _bahamut: Bahamut;

    // ID of this shard
    private _shardId = -1;

    constructor(bahamut: Bahamut, options?: Discord.ClientOptions) {
        super({
            ...options,
            makeCache: Discord.Options.cacheWithLimits({
                MessageManager: 1000,
            }),
            // messageCacheLifetime: 43200,
            // messageSweepInterval: 3600,
            intents: [
                Discord.IntentsBitField.Flags.Guilds,
                Discord.IntentsBitField.Flags.GuildMembers,
                Discord.IntentsBitField.Flags.GuildBans,
                Discord.IntentsBitField.Flags.GuildEmojisAndStickers,
                Discord.IntentsBitField.Flags.GuildInvites,
                Discord.IntentsBitField.Flags.GuildVoiceStates,
                Discord.IntentsBitField.Flags.GuildPresences,
                Discord.IntentsBitField.Flags.GuildMessages,
                Discord.IntentsBitField.Flags.GuildMessageReactions,
                Discord.IntentsBitField.Flags.GuildMessageTyping,
                Discord.IntentsBitField.Flags.DirectMessages,
                Discord.IntentsBitField.Flags.DirectMessageReactions,
                Discord.IntentsBitField.Flags.MessageContent,
            ],
            partials: [
                Discord.Partials.Message,
                Discord.Partials.Reaction,
                Discord.Partials.Channel,
            ],
        });

        this._bahamut = bahamut;
    }

    public get bahamut() {
        return this._bahamut;
    }
    public get shardId() {
        return this._shardId;
    }
    public set shardId(newShardId: number) {
        if (newShardId < 0) throw new Error("Shard ID can't be lower than 0!");

        this._shardId = newShardId;
    }
}