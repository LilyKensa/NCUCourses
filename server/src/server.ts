import Fastify from "fastify";
import { Config } from "@ncu-courses/shared/config";
import * as PinoPretty from "pino-pretty";
import { routeApi } from "./routes/api";

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

app.register(routeApi, { prefix: "/ncu-courses/api" });

export const startServer = async () => {
  await app.listen({ 
    host: "0.0.0.0",
    port: Config.serverPort
  });
};