import { allowedColumns, operatorMap, QueryColumn, QueryNode } from "@ncu-courses/shared/types/query";

export namespace Query {
  export function buildWhereClause(
    node: QueryNode,
    params: any[] = []
  ): { sql: string; params: any[] } {
    if ("field" in node) {
      if (!allowedColumns.has(node.field as QueryColumn)) {
        throw new Error(`Forbidden or unknown column: ${node.field}`);
      }

      const sqlOp = operatorMap[node.op];
      if (!sqlOp) {
        throw new Error(`Unsupported operator: ${node.op}`);
      }

      if (node.op === "in") {
        if (!Array.isArray(node.value) || node.value.length === 0) {
          throw new Error(`Operator "in" requires a non-empty array`);
        }
        const placeholders = node.value.map(() => "?").join(", ");
        params.push(...node.value);
        return { sql: `"${node.field}" IN (${placeholders})`, params };
      }

      params.push(node.value);
      return { sql: `"${node.field}" ${sqlOp} ?`, params };
    }

    // 2. Logical branch: AND / OR
    if ("and" in node && Array.isArray(node.and)) {
      if (node.and.length === 0) return { sql: "1=1", params };
      const clauses = node.and.map(child => buildWhereClause(child, params).sql);
      return { sql: `(${clauses.join(" AND ")})`, params };
    }

    if ("or" in node && Array.isArray(node.or)) {
      if (node.or.length === 0) return { sql: "1=0", params };
      const clauses = node.or.map(child => buildWhereClause(child, params).sql);
      return { sql: `(${clauses.join(" OR ")})`, params };
    }

    if ("not" in node && node.not !== undefined) {
      return { sql: `NOT (${buildWhereClause(node.not, params).sql})`, params };
    }

    throw new Error("Invalid query node structure");
  }
}