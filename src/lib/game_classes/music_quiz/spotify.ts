import SpotifyApi from "spotify-web-api-node";
import { randomIntBetween } from "../../toolFunctions.js";

export default class Spotify {
    client: SpotifyApi;

    constructor(clientId: string, clientSecret: string) {
        this.client = new SpotifyApi({
            clientId: clientId,
            clientSecret: clientSecret,
        });
    }

    async authorize() {
        const response = await this.client.clientCredentialsGrant();

        this.client.setAccessToken(response.body.access_token);
    }

    async getPlaylist(id: string, limit = 10) {
        const result = await this.client.getPlaylistTracks(id, { limit: limit, offset: randomIntBetween(1, 30) });

        return result.body.items.map(({ track }) => track);
    }
}