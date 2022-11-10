import BahamutClient from "../modules/BahamutClient";
import Discord from "discord.js";
import {HandleMessageOptions, MessageDeleteOptions} from "../../typings";
import {CommandObject} from "wokcommands";

/**
 * Handle message response to message or interaction
 * @param client
 * @param initMessage
 * @param overwriteInitMessage
 * @param deferReply
 * @param newMessageContent
 * @param deleteOptions
 */
const handleResponseToMessage = async(
    client: BahamutClient,
    initMessage: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse,
    overwriteInitMessage: boolean = false,
    deferReply: boolean | "ephemeral",
    newMessageContent: HandleMessageOptions,
    deleteOptions?: MessageDeleteOptions,
) => {
    let response: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse;

    if (newMessageContent.embeds && newMessageContent.embeds.length > 0) {
        for (const e of newMessageContent.embeds!) {
            if (!e.data.color) e.setColor(client.bahamut.config.primary_message_color);
        }
    }

    if ((initMessage instanceof Discord.Message) && overwriteInitMessage) {
        response = await initMessage.edit(newMessageContent);
    }
    else if ((initMessage instanceof Discord.Message) && !overwriteInitMessage) {
        response = await initMessage.reply(newMessageContent);
    }
    else if (initMessage instanceof Discord.CommandInteraction) {
        if (deferReply) {
            response = initMessage;

            await initMessage.editReply({
                ...newMessageContent
            });
        }
        else response = await initMessage.reply(newMessageContent);
    } else {
        // Return error message
        return initMessage;
    }

    await handleDeleteMessage(client, initMessage, response, deleteOptions);

    return response;
}

const handleErrorResponseToMessage = async(
    client: BahamutClient,
    initMessage: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse,
    overwriteInitMessage: boolean = false,
    deferReply: boolean | "ephemeral",
    newMessageContent: HandleMessageOptions | string,
    deleteOptions?: MessageDeleteOptions,
) => {
    let response: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse;

    if (!(typeof newMessageContent === "string")) {
        if (newMessageContent.embeds && newMessageContent.embeds.length > 0) {
            for (const e of newMessageContent.embeds!) {
                e.setColor(client.bahamut.config.error_message_color);
            }
        }
    }

    response = await handleResponseToMessage(client, initMessage, overwriteInitMessage, deferReply, createErrorResponse(client, newMessageContent), deleteOptions);

    await handleDeleteMessage(client, initMessage, response, deleteOptions);

    return response;
}
const createErrorResponse = (client: BahamutClient, newMessageContent: HandleMessageOptions | string) => {
    return (typeof newMessageContent === "string" ? {
        embeds: [
            new Discord.EmbedBuilder()
                .setAuthor({ name: "Error", iconURL: client.bahamut.config.message_icons.error })
                .setDescription(newMessageContent)
                // @ts-ignore
                .setColor(client.bahamut.config.error_message_color)
        ]
    } : {
        content: newMessageContent.content || null,
        files: newMessageContent.files || null,
        embeds: newMessageContent.embeds?.map(e => {
            return new Discord.EmbedBuilder()
                // @ts-ignore
                .setColor(client.bahamut.config.error_message_color)
                .setDescription(e.data.description)
                .setAuthor((newMessageContent.title ? null : { name: "Error", iconURL: client.bahamut.config.message_icons.error }))
                .setTitle(newMessageContent.title || null)
        }) || null,
    }) as HandleMessageOptions;
}
const createMissingParamsErrorResponse = (
    client: BahamutClient,
    command: Omit<CommandObject, "callback">
) => {
    return {
        embeds: [
            new Discord.EmbedBuilder()
                .setAuthor({ name: "Error", iconURL: client.bahamut.config.message_icons.error })
                .setDescription("I couldn\\'t invoke this command, because of missing or wrong parameters!")
                // @ts-ignore
                .setColor(client.bahamut.config.error_message_color)
                .setFields([
                    { name: "Usage", value: `\`\`\`${(command.correctSyntax ? (command.name + " " + command.correctSyntax) : (command.expectedArgs ?
                            command.name + " " + command.expectedArgs : "No usage information found. Please inform the bot author of this issue!"))}\`\`\`` }
                ])
        ]
    } as HandleMessageOptions
}

const handleSuccessResponseToMessage = async (
    client: BahamutClient,
    initMessage: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse,
    overwriteInitMessage: boolean = false,
    deferReply: boolean | "ephemeral",
    newMessageContent: HandleMessageOptions | string,
    deleteOptions?: MessageDeleteOptions,
) => {
    let response: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse;

    if (!(typeof newMessageContent === "string")) {
        if (newMessageContent.embeds && newMessageContent.embeds.length > 0) {
            for (const e of newMessageContent.embeds!) {
                e.setAuthor({ name: "Success", value: client.bahamut.config.message_icons.success })
                e.setColor(client.bahamut.config.primary_message_color);
            }
        }
    }

    response = await handleResponseToMessage(client, initMessage, overwriteInitMessage, deferReply, createSuccessResponse(client, newMessageContent), deleteOptions);

    await handleDeleteMessage(client, initMessage, response, deleteOptions);

    return response;
};
const createSuccessResponse = (client: BahamutClient, newMessageContent: HandleMessageOptions | string) => {
    return (typeof newMessageContent === "string" ? {
        embeds: [
            new Discord.EmbedBuilder()
                .setAuthor({ name: "Success", iconURL: client.bahamut.config.message_icons.success })
                .setDescription(newMessageContent)
                // @ts-ignore
                .setColor(client.bahamut.config.primary_message_color)
        ]
    } : {
        content: newMessageContent.content || null,
        files: newMessageContent.files || null,
        embeds: newMessageContent.embeds?.map(e => {
            return new Discord.EmbedBuilder()
                // @ts-ignore
                .setColor(client.bahamut.config.primary_message_color)
                .setDescription(e.data.description || null)
                .setAuthor((newMessageContent.title ? null : { name: "Success", iconURL: client.bahamut.config.message_icons.success }))
                .setTitle(newMessageContent.title || null)
        }) || null,
    }) as HandleMessageOptions;
}

/**
 * Handle message response to channel
 * @param client
 * @param sourceChannel
 * @param newMessageContent
 * @param deleteOptions
 */
const handleInfoResponseToChannel = async(client: BahamutClient, sourceChannel: Discord.GuildTextBasedChannel, newMessageContent: HandleMessageOptions, deleteOptions?: MessageDeleteOptions) => {
    let response: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse;

    for (const e of newMessageContent.embeds!) {
        if (!e.data.color) e.setColor(client.bahamut.config.primary_message_color);
    }

    response = await sourceChannel.send(newMessageContent)

    await handleDeleteMessage(client, null, response, deleteOptions);

    return response;
}


const handleDeleteMessage = async(
    client: BahamutClient,
    initMessage: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse | null,
    responseMessage: Discord.Message | Discord.CommandInteraction | Discord.InteractionResponse,
    // if null use default
    deleteOptions: MessageDeleteOptions | null = null
) => {
    // implement delete message checks
}

export { handleInfoResponseToChannel, handleResponseToMessage, handleErrorResponseToMessage, handleSuccessResponseToMessage, createErrorResponse, createSuccessResponse, createMissingParamsErrorResponse }