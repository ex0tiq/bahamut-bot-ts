import { Kazagumo, KazagumoPlayer, KazagumoPlayerOptions } from "kazagumo";
import { Player } from "shoukaku";
import LavaManager from "./LavaManager.js";


export default class ExtendedKazagumoPlayer {

    private _currentFilterName: string | null = null;

    private _currentRadioStationName: string | null = null;

    private _skipTrackStart: boolean = false;

    private _currentlyRunningGameName: string | null = null;

    private _manager: LavaManager;

    private _player: KazagumoPlayer;


    constructor(manager: LavaManager, player: KazagumoPlayer) {
        this._manager = manager;
        this._player = player;
    }


    public get kazaPlayer() {
        return this._player;
    }


    public destroy() {
        this._manager.players.delete(this._player.guildId);
        this._player.destroy();
    }

    public getCurrentFilterName() {
        return this._currentFilterName;
    }
    public setCurrentFilterName(filter: string | null) {
        this._currentFilterName = filter;
    }

    public getCurrentRadioStationName() {
        return this._currentRadioStationName;
    }
    public setCurrentRadioStationName(name: string | null) {
        this._currentRadioStationName = name;
    }

    public getSkipTrackStart() {
        return this._skipTrackStart;
    }
    public setSkipTrackStart(skip: boolean) {
        this._skipTrackStart = skip;
    }

    public getCurrentlyRunningGameName() {
        return this._currentlyRunningGameName;
    }
    public setCurrentlyRunningGameName(name: string | null) {
        this._currentlyRunningGameName = name;
    }

}