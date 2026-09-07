import { FastifyPluginAsync } from "fastify";
import { endpointApiPing } from "./ping";

export const routeApi: FastifyPluginAsync = async (route, options) =>{
  route.register(endpointApiPing);
};