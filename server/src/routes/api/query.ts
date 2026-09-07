import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { Db } from "../../database";
import { QueryNode } from "@ncu-courses/shared/types/query";

interface SearchBody {
  filter?: QueryNode;
  limit?: number;
  offset?: number;
}

export const endpointApiQuery: FastifyPluginAsync = async (route, options) =>{
  route.post("/query", async (req: FastifyRequest<{ Body: SearchBody }>, res) => {
    try {
      const { filter, limit, offset } = req.body || {};
      
      const rows = Db.query(filter, limit, offset);
      return rows;
    } 
    catch (err: any) {
      res.status(400).send({ 
        message: err.message,
        error: "Bad Request",
        statusCode: 400
      });
    }
  });
};