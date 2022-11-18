import express from "express";
import logger from "./Logger";
import BahamutClient from "./BahamutClient";
import { BahamutShardingBootManager } from "../../typings";

export default class BotAPIHandler {
    private shardManager: BahamutShardingBootManager;
    private srv;
    private listener;
    private readonly communication_token: string;
    private readonly apiPort: number;

    constructor(shardManager: BahamutShardingBootManager, communication_token: string) {
        this.srv = express();
        this.shardManager = shardManager;
        this.communication_token = communication_token;
        this.apiPort = this.shardManager.apiConfig.api_port;

        // Support for json bodies (post)
        this.srv.use(express.json());
        // Support static files
        this.srv.use(express.static("assets"));
        // Require valid api key for every request
        this.srv.use((req, res, next) => {
            res.header("Content-Type", "application/json");

            let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
            if (ip?.includes(":")) {
                const t = Array.isArray(ip) ? ip[0].split(":") : ip.split(":");
                ip = t.slice(t.length - 2);
                ip = ip.length > 1 ? ip[1] : ip[0];
            }

            // Abort if no shard available for requests
            if (!this.shardManager.shardReady) {
                res.status(503);
                res.end(JSON.stringify({
                    status: "error",
                    message: "No server available for request handling.",
                    result: null,
                }));
                return;
            }

            if (!this.shardManager.config.uplink_api_allowed_ips.includes((Array.isArray(ip) ? ip.join("") : ip) || "") || !req.query || !req.query.communication_token || this.communication_token !== req.query.communication_token) {
                logger.error("SM", `API request from IP ${ip} denied!`);
                res.status(403);
                res.end(JSON.stringify({
                    status: "error",
                    message: "Access denied",
                    result: null,
                }));
                return;
            } else {
                next();
            }
        });
        // Abort if invalid json found
        // eslint-disable-next-line no-unused-vars
        this.srv.use((err: any, req: any, res: { status: (arg0: number) => void; end: (arg0: string) => void; }, next: any) => {
            console.log(err);
            // 'SyntaxError: Unexpected token n in JSON at position 0'
            res.status(400);
            res.end(JSON.stringify({
                status: "error",
                message: "Bad request",
                result: null,
            }));
            return;
        });

        this.registerHandlers();

        this.listener = this.srv.listen(this.apiPort, () => {
            // @ts-ignore
            logger.ready("SM", `API is listening on port: ${this.listener.address()!.port}`);
        });
    }

    registerHandlers() {
        this.srv.get("/", (req, res) => {
            res.end(JSON.stringify({
                status: "success",
                message: "",
                result: `Bahamut v${process.env.npm_package_version} ready!`,
            }));
            return;
        });

        this.srv.post("/broadcast", async (req, res) => {
            if (!req.body.code) {
                res.status(400);
                res.end(JSON.stringify({
                    status: "error",
                    message: "Bad request",
                    result: null,
                }));
                return;
            }

            const result = await this.shardManager.broadcastEval((_client: BahamutClient, obj) => {
                if (obj.shard && _client.shardId !== obj.shard) return null;
                if (obj.guild && !_client.guilds.cache.has(obj.guild)) return null;

                const code = `
                const c = ${obj.code}; 
                c(_client, obj);`;

                // DANGEROUS!!
                return eval(code);
            }, { shard: req.body.shard, context: { shard: req.body.shard, guild: req.body.guild, code: req.body.code, ...req.body.additionalContext } });

            const r = {
                status: "success",
                message: "",
                result: result,
            };
            if (req.query.includeTimeInformation) {
                r.result = {
                    timeInfo: {
                        localTime: Date.now(),
                        startupTime: this.shardManager.startTime,
                    },
                    origResult: result,
                };
            }

            res.end(JSON.stringify(r));
        });

        this.srv.post("/shardmanEval", async (req, res) => {
            if (!req.body.code) {
                res.status(400);
                res.end(JSON.stringify({
                    status: "error",
                    message: "Bad request",
                    result: null,
                }));
                return;
            }

            let result = eval(`(${req.body.code})`);
            result = (req.body.code.startsWith("async") ? await result() : result());

            res.end(JSON.stringify({
                status: "success",
                message: "",
                result: result,
            }));
            return;
        });

        this.srv.get("*", (req, res) => {
            res.status(404);
            res.end(JSON.stringify({
                status: "error",
                message: "Resource not found",
                result: null,
            }));
            return;
        });
    }
}