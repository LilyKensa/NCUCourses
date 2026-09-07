import { FastifyPluginAsync } from "fastify";

export const endpointApiPing: FastifyPluginAsync = async (route, options) =>{
  route.get("/ping", async () => {
    return { 
      status: "ok", 
      timestamp: new Date().toISOString()
    };
  });
};