import path, { resolve } from "path";
import emoji from "node-emoji";
import { getAllFiles } from "./toolFunctions";
import BahamutClient from "../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "./getFunctions";

export default class LanguageMessageHandler {
    static language_files: Map<string, Map<string, string>> = new Map();

    /**
     * Initialize all language files
     */
    static initLanguageFiles = async () => {
        const langFiles = getAllFiles(resolve("assets/lang/"));
        langFiles.forEach(file => {
            try {
                const parse = path.parse(file.filePath);
                this.language_files.set(parse.name, new Map(Object.entries(file.fileContents)));
            } catch {
                // Nothing
            }
        });
    };

    /**
     * Get a message in the current guils language
     * @param { Discord.Client } client The current discord client object
     * @param { Discord.Guild } guild The guild
     * @param { string } msg_key The key of the message
     * @param { object } replacers Optional. Replacers for the messages.
     * @returns string
     */
    static async getMessage(client: BahamutClient, guild: Discord.Guild, msg_key: string, replacers?: object): Promise<string> {
        const origLang = ((await getGuildSettings(client, guild))["language"] || "en");
        let	lang = origLang;

        // If lang is not available in global lang files
        if (!this.language_files.has(lang)) {
            if (!this.language_files.has("en")) return `Language "${origLang}" ist not available. Please try again.`;
            else lang = "en";
        }
        // If message key is not available in language
        if (!(this.language_files.get(lang)!.has(msg_key))) return `Message key '${msg_key}' is currently not available in language '${origLang}'. Please try again or switch to another language.`;

        let langString = this.language_files.get(lang)!.get(msg_key);
        if (!langString) return `Message key '${msg_key}' is currently not available in language '${origLang}'. Please try again or switch to another language.`;

        if (langString!.toLowerCase().includes("%emoji-")) {
            const matches = langString!.toLowerCase().match(/%emoji-.+?%/g) || [];
            for (const m of matches) {
                const em = m.replace(/%/g, "").replace(/emoji-/g, "");
                langString = langString!.replace(m, emoji.get(em));
            }
        }
        if (replacers) {
            for (const [key, val] of Object.entries(replacers)) {
                langString = langString!.replace(`%${key}%`, val);
            }
        }

        return langString;
    }
}