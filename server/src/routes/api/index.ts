import { FastifyPluginAsync } from "fastify";
import { endpointApiPing } from "./ping";
import { endpointApiQuery } from "./query";

export const routeApi: FastifyPluginAsync = async (route, options) =>{
  route.register(endpointApiPing);
  route.register(endpointApiQuery);
};