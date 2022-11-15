import { Bahamut } from "../../bahamut";

export default (bahamut: Bahamut) => {
    bahamut.eventHandler.on("hangman_finish", (channel) => {
        bahamut.runningGames.delete(channel.id);
    });
};