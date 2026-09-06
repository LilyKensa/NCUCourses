import Fastify, { FastifyPluginAsync } from "fastify";
import { Config } from "@ncu-courses/shared/config";
import * as PinoPretty from "pino-pretty";

const app = Fastify({
  routerOptions: {
    ignoreTrailingSlash: true
  },
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,                   
        singleLine: true,            
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname"
      } satisfies PinoPretty.PrettyOptions
    }
  }
});

const apiRoutes: FastifyPluginAsync = async (route, options) =>{
  route.get("/ping", async () => {
    return { 
      status: "ok", 
      timestamp: new Date().toISOString()
    };
  });
};

app.register(apiRoutes, { prefix: "/ncu-courses/api" });

const start = async () => {
  await app.listen({ 
    host: "0.0.0.0",
    port: Config.serverPort
  });
};

start();