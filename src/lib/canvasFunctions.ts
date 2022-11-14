import imageSizeOf from "image-size";
import Canvas, { CanvasRenderingContext2D } from "canvas";
import axios from "axios";
import { isUrl } from "./validateFunctions";
import Discord from "discord.js";

import pify from "pify";
const imageSizeOfP = pify(imageSizeOf);

const createShipImage = async ({ user1, user2, shipPercent = 20 }: { user1: Discord.GuildMember, user2: Discord.GuildMember, shipPercent: number }) => {
    const canvas = Canvas.createCanvas(540, 200),
        ctx = canvas.getContext("2d"),
        background = await Canvas.loadImage("assets/img/cards/ship/bg_ship.jpg");
    const user1avatarLink = user1.avatarURL({ forceStatic: true }) || user1.user.avatarURL({ forceStatic: true }) || user1.user.defaultAvatarURL,
        user2avatarLink = user2.avatarURL({ forceStatic: true }) || user2.user.avatarURL({ forceStatic: true }) || user1.user.defaultAvatarURL;
    let user1avatar, user2avatar;

    try {
        const [data1, data2] = await Promise.all([
            axios(user1avatarLink, {
                responseType: "arraybuffer",
            }),
            axios(user2avatarLink, {
                responseType: "arraybuffer",
            }),
        ]);
        [user1avatar, user2avatar] = await Promise.all([
            Buffer.from(data1.data),
            Buffer.from(data2.data),
        ]);
    } catch (err) {
        console.error("Error creating ship image:", err);
        return null;
    }

    if(!user1avatar || !user2avatar) {
        return null;
    }

    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 1 - (shipPercent / 100);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // User 1 Text
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "20px Manrope";
    ctx.fillStyle = "white";
    ctx.fillText(user1.displayName, 25, 20);

    // User 2 Text
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.font = "20px Manrope";
    ctx.fillStyle = "white";
    ctx.fillText(user2.displayName, canvas.width - 25, canvas.height - 20);

    // % Match Text
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "40px Manrope";
    ctx.fillStyle = "white";
    ctx.fillText(`${shipPercent}%`, (canvas.width / 2), (canvas.height / 2) - 20);
    // % Match Subtext
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "24px Manrope";
    ctx.fillStyle = "white";
    ctx.fillText("match", (canvas.width / 2), (canvas.height / 2) + 10);

    ctx.save();

    let image = await Canvas.loadImage(user1avatar);

    // User 1 Avatar
    ctx.beginPath();
    ctx.arc(((20 + 120) / 2) + 10, canvas.height / 2, 60, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, 20, 40, 120, 120);
    ctx.restore();

    // User 2 Avatar
    image = await Canvas.loadImage(user2avatar);
    ctx.beginPath();
    ctx.arc((canvas.width - ((120 + 20) / 2) - 10), canvas.height / 2, 60, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, (canvas.width - (120 + 20)), 40, 120, 120);
    ctx.restore();

    return canvas.toBuffer();
};

const createPortraitImage = async ({ title, subtitle, source, font = "Arial", fontTitleSize = 42, fontSubtitleSize = 26, captionHeight = 120, decorateCaptionTextFillStyle = null,
                                       decorateCaptionFillStyle = null, offsetCaptionX = 0, offsetCaptionY = 0, offsetTitleX = 0, offsetTitleY = 0, offsetSubTitleX = 0, offsetSubtitleY = 0 } :
                                       { title: string, subtitle: string, source: string, font?: string, fontTitleSize?: number, fontSubtitleSize?: number, captionHeight?: number,
                                           decorateCaptionTextFillStyle?: string | null, decorateCaptionFillStyle?: string | null, offsetCaptionX?: number, offsetCaptionY?: number, offsetTitleX?: number,
                                           offsetTitleY?: number, offsetSubTitleX?: number, offsetSubtitleY?: number }) => {
    // Draw base image
    let image = null, width = 0, height = 0;
    if (isUrl(source)) {
        try {
            const data = await axios(source, {
                responseType: "arraybuffer",
            }), dataBuffer = await Buffer.from(data.data);

            const size = imageSizeOf(dataBuffer);
            width = size.width || 0;
            height = size.height || 0;

            image = new Canvas.Image();
            image.src = dataBuffer;
        } catch (err) {
            console.error("Error creating portrait canvas:", err);
            return null;
        }
    } else {
        const size = await imageSizeOfP(source);
        // @ts-ignore
        width = size.width || 0;
        // @ts-ignore
        height = size.height || 0;

        image = await Canvas.loadImage(source);
    }

    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0);

    // Hold computed caption position
    const captionX = offsetCaptionX + 10;
    const captionY = (offsetCaptionY + height - 10) - captionHeight;
    const captionTitleX = offsetTitleX + 10;
    const captionTitleY = (offsetTitleY + height - 10) - captionHeight;
    const captionSubtitleX = offsetSubTitleX;
    const captionSubtitleY = (offsetSubtitleY + height - 10) - captionHeight;
    const captionTitleTextX = captionTitleX + (width / 2);
    const captionTitleTextY = captionTitleY + (captionHeight / 2);
    const captionSubtitleTextX = captionSubtitleX + (width / 2);
    const captionSubtitleTextY = captionSubtitleY + (captionHeight / 2);

    width = width - 20;

    const createGradient = (first: string, second: string) => {
        const grd = ctx.createLinearGradient(width, captionY, width, height);
        grd.addColorStop(0, first);
        grd.addColorStop(1, second);

        return grd;
    };

    // Fill caption rect
    ctx.fillStyle = decorateCaptionFillStyle
        ? decorateCaptionFillStyle
        : createGradient("rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 1)");
    // ctx.fillRect(captionX, captionY, width, captionHeight);
    roundRect(ctx, captionX, captionY, width, captionHeight, 5, true);

    // Fill caption text
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = `${fontTitleSize}px ${font}`;
    ctx.fillStyle = decorateCaptionTextFillStyle
        ? decorateCaptionTextFillStyle
        : "white";
    ctx.fillText(title, captionTitleTextX, captionTitleTextY);

    // Fill subtitle text
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = `${fontSubtitleSize}px ${font}`;
    ctx.fillStyle = decorateCaptionTextFillStyle
        ? decorateCaptionTextFillStyle
        : "white";
    ctx.fillText(subtitle, captionSubtitleTextX, captionSubtitleTextY);

    return canvas.toBuffer();
};

/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number | { tl: number, tr: number, br: number, bl: number } = 5, fill: boolean, stroke: boolean = true) {
    if (typeof stroke === "undefined") stroke = true;
    if (typeof radius === "undefined") radius = 5;
    if (typeof radius === "number") {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
        const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
        for (const side in defaultRadius) {
            // @ts-ignore
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

export { createPortraitImage, createShipImage };