import logger from "./Logger.js";
import axios from "axios";
import { BahamutShardingBootManager, BootConfig, BootManager } from "../../typings.js";

export default class UplinkAPIHandler {
    private apiConnectionStatus: boolean = false;
    private lastConnectionTimestamp: number | undefined = undefined;
    private heartbeatTimerId: ReturnType<typeof setInterval> | undefined = undefined;
    private heartbeatFailedCount: number = 0;
    private reconnectTimerId: ReturnType<typeof setInterval> | undefined = undefined;

    private heartbeatInterval: number = 5000;
    private reconnectTimeout: number = 10000;
    private connectionTimeout: number = 2000;

    private _shardManager: BootManager | BahamutShardingBootManager;
    private readonly _communicationToken: string;

    constructor(shardManager: BootManager, communication_token: string) {
        this._shardManager = shardManager;
        this._communicationToken = communication_token;
    }

    setManager(shardManager: BahamutShardingBootManager) {
        this._shardManager = shardManager;
    }

    // This function is supposed to only be calle once, unless the heartbeatTimer is not cancelled
    async initHeartbeat(skipChecks = false, startup = false) {
        if (skipChecks) {
            if (!this._shardManager.config.uplink_api_url) {
                logger.error("SM", "No API configured, aborting heartbeat init.");
                return null;
            }
            if (!startup) {
                if(await this.isApiReachable()) {
                    logger.ready("SM", "API is reachable! Initializing heartbeat...");
                } else {
                    logger.error("SM", "Connection to API failed! Aborting heartbeat init.");
                    await this.startReconnect();
                    return null;
                }
            }
        }

        if (!startup) {
            this.heartbeatTimerId = setInterval(async () => {
                await this.handleHeartbeat(false);
            }, this.heartbeatInterval);
        }

        return this.handleHeartbeat(true);
    }

    async handleHeartbeat(startup = false): Promise<BootConfig | boolean> {
        if (!this._shardManager.config.uplink_api_url) return false;

        try {
            const result = await axios.post(`${this._shardManager.config.uplink_api_url}srvHeartbeat?registerToken=${this._shardManager.config.uplink_api_register_token}`, {
                port: this._shardManager.apiConfig?.api_port,
                serverId: this._shardManager.config.uplink_api_serverId,
                communication_token: this._communicationToken,
                managedShards: ((startup || !this._shardManager.shardReady) ? null : await (<BahamutShardingBootManager>this._shardManager).fn.getManagedShards()),
                startupTime: this._shardManager.startTime,
                currentTime: Date.now(),
                serverLocation: this._shardManager.config.uplink_api_server_location,
                requestBootConf: startup,
            }, {
                timeout: this.connectionTimeout,
            });

            if (result && result.data && result.data.status && result.data.status === "success") {
                if (this.heartbeatFailedCount > 0) {
                    logger.ready("SM", `Connection to API re-established! (Connected to: ${result.request.socket._httpMessage.host})`);
                    this.heartbeatFailedCount = 0;
                } else if (!this.apiConnectionStatus && startup) {
                    logger.ready("SM", `Connection to API established! (Connected to: ${result.request.socket._httpMessage.host})`);
                }

                this.apiConnectionStatus = true;
                this.lastConnectionTimestamp = Date.now();

                if (result.data.message.toLowerCase() === "bootconf") return result.data.result;

                return true;
            } else if (this.heartbeatFailedCount > 2) {
                logger.error("SM", "API unreachable, trying to reconnect...");

                await this.stopHeartbeat(!startup);
                this.apiConnectionStatus = false;
                return false;
            } else {
                logger.error("SM", `API Heartbeat failed, trying to reconnect... Try ${this.heartbeatFailedCount + 1}`);
                this.heartbeatFailedCount++;
                return false;
            }
        } catch (ex) {
            console.error(ex);
            // logger.error('SM', ex.message);
            // @ts-ignore
            if (ex.response && (ex.response.status < 200 || ex.response.status >= 300)) {
                // @ts-ignore
                if (ex.response.data.status === "error") {
                    logger.error("SM", "Registration at API failed! Trying again...");
                    // await this.stopHeartbeat(true);
                    return false;
                }
            }

            if (this.heartbeatFailedCount > 2) {
                logger.error("SM", "API unreachable, trying to reconnect...");

                await this.stopHeartbeat(!startup);
                this.apiConnectionStatus = false;
            } else {
                logger.error("SM", `API Heartbeat failed, trying to reconnect... Try ${this.heartbeatFailedCount + 1}`);
                this.heartbeatFailedCount++;
            }
            return false;
        }
    }

    async stopHeartbeat(startReconnectTimer = false) {
        if (!this.heartbeatTimerId || !this._shardManager.config.uplink_api_url) return;

        clearInterval(this.heartbeatTimerId);
        this.heartbeatTimerId = undefined;

        if (startReconnectTimer) await this.startReconnect();
    }

    async startReconnect() {
        this.reconnectTimerId = setInterval(async () => {
            if(await this.isApiReachable()) {
                await this.initHeartbeat(true);
                clearInterval(this.reconnectTimerId);
                this.reconnectTimerId = undefined;
            } else {
                logger.error("SM", `Connection to API failed! Trying again in ${this.reconnectTimeout / 1000} seconds...`);
            }
        }, this.reconnectTimeout);
    }

    async isApiReachable() {
        try {
            const result = await axios.get(this._shardManager.config.uplink_api_url, {
                timeout: this.connectionTimeout,
            });
            if (result && result.data && result.data.status && result.data.status === "success") return true;

            return false;
        } catch (ex) {
            // @ts-ignore
            if (ex.response) return true;
            return false;
        }
    }
}