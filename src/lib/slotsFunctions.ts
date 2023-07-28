import { randomIntBetween } from "./toolFunctions.js";
import BahamutClient from "../modules/BahamutClient.js";
import Discord from "discord.js";

/**
 * Generate the embed message for the slot machine
 * @param client
 * @param message
 * @param emojis
 * @param resultEmojis
 */
const generateSlotsEmbed = (client: BahamutClient, emojis: string[] = [], resultEmojis: string[] = []) => {
    const objEmojiAnim = [
        { "slots4_anim": "809832919538335854" },
        { "slots3_anim": "809832919471357982" },
        { "slots2_anim": "809832919509630976" },
        { "slots1_anim": "809832919542661120" },
    ], emojiAnim = objEmojiAnim.map((e) => {
        return `<a:${Object.keys(e)[0]}:${Object.values(e)[0]}>`;
    });
    if (resultEmojis.length < 3) {
        return new Discord.EmbedBuilder()
            .setAuthor({ name: "Slot Machine", iconURL: client.bahamut.config.cookie_images.slots_icon })
            .setDescription(`${emojiAnim[0]}\t\t | ${emojiAnim[2]} | ${emojiAnim[3]}
			${emojiAnim[1]} | ${emojiAnim[3]} | ${emojiAnim[2]}
			${emojiAnim[2]} | ${emojiAnim[1]} | ${emojiAnim[0]}
			---------------
			${emojiAnim[3]} | ${emojiAnim[0]} | ${emojiAnim[1]}
			---------------
		`);
    } else if (resultEmojis.length === 3) {
        const firstRow: string[] = [], secondRow: string[] = [], thirdRow: string[] = [];

        while (firstRow.length <= 3) {
            const rand = emojis[randomIntBetween(0, 5)];
            if ((rand !== resultEmojis[0]) && !firstRow.includes(rand)) {
                firstRow.push(rand);
            }
        }
        while (secondRow.length <= 3) {
            const rand = emojis[randomIntBetween(0, 5)];
            if ((rand !== resultEmojis[1]) && !secondRow.includes(rand)) {
                secondRow.push(rand);
            }
        }
        while (thirdRow.length <= 3) {
            const rand = emojis[randomIntBetween(0, 5)];
            if ((rand !== resultEmojis[2]) && !thirdRow.includes(rand)) {
                thirdRow.push(rand);
            }
        }

        return new Discord.EmbedBuilder()
            .setAuthor({ name: "Slot Machine", iconURL: client.bahamut.config.cookie_images.slots_icon })
            .setDescription(`${firstRow[0]} | ${secondRow[0]} | ${thirdRow[0]}
			${firstRow[1]} | ${secondRow[1]} | ${thirdRow[1]}
			${firstRow[2]} | ${secondRow[2]} | ${thirdRow[2]}
			---------------
			${resultEmojis[0]} | ${resultEmojis[1]} | ${resultEmojis[2]}
			---------------
		`);
    } else {
        return null;
    }
};

export { generateSlotsEmbed };