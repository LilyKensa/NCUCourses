import { ARRAY_FIELDS, MatchCondition, QueryNode, SCALAR_FIELDS } from "@ncu-courses/shared/types/query";

export class Query {
  
  private static buildCondition(column: string, match: MatchCondition, params: any[]): string {
    const { op, value } = match;
    
    switch (op) {
      case "eq":
        params.push(value);
        return `${column} = ?`;
      case "neq":
        params.push(value);
        return `${column} != ?`;
      case "gt":
        params.push(value);
        return `${column} > ?`;
      case "gte":
        params.push(value);
        return `${column} >= ?`;
      case "lt":
        params.push(value);
        return `${column} < ?`;
      case "lte":
        params.push(value);
        return `${column} <= ?`;
      case "includes":
        params.push(`%${value}%`);
        return `${column} LIKE ?`;
      case "in":
        if (!Array.isArray(value)) throw new Error(`"in" operator requires an array of values`);
        if (value.length === 0) return "1=0"; // Safely handle empty IN () arrays
        params.push(...value);
        const placeholders = value.map(() => "?").join(", ");
        return `${column} IN (${placeholders})`;
      default:
        throw new Error(`Unsupported operator: ${op}`);
    }
  }

  /**
   * Recursively parses the AST and returns a SQL fragment.
   * Bound parameters are pushed directly into the `params` array.
   */
  static buildWhereClause(node: QueryNode, params: any[]): { sql: string } {
    // Logic Operators
    if ("and" in node) {
      if (node.and.length === 0) return { sql: "1=1" };
      const clauses = node.and.map((n) => this.buildWhereClause(n, params).sql);
      return { sql: `(${clauses.join(" AND ")})` };
    }

    if ("or" in node) {
      if (node.or.length === 0) return { sql: "1=0" };
      const clauses = node.or.map((n) => this.buildWhereClause(n, params).sql);
      return { sql: `(${clauses.join(" OR ")})` };
    }

    if ("not" in node) {
      const inner = this.buildWhereClause(node.not, params).sql;
      return { sql: `(NOT ${inner})` };
    }

    // Array (Relational) Fields
    if ("each" in node) {
      const table = ARRAY_FIELDS[node.field];
      if (!table) throw new Error(`Unknown array field: ${node.field}`);

      const condition = this.buildCondition("prop", node.each, params);

      if (node.op === "any") {
        return {
          sql: `EXISTS (SELECT 1 FROM ${table} WHERE course_id = c.id AND ${condition})`
        };
      } 
      
      if (node.op === "all") {
        // Course must have at least 1 element AND NO elements that fail the condition
        return {
          sql: `(EXISTS (SELECT 1 FROM ${table} WHERE course_id = c.id) AND NOT EXISTS (SELECT 1 FROM ${table} WHERE course_id = c.id AND NOT (${condition})))`
        };
      }
    }

    // Scalar Fields
    if ("match" in node) {
      const column = SCALAR_FIELDS[node.field as string];
      if (!column) throw new Error(`Unknown scalar field: ${node.field}`);
      
      return { sql: this.buildCondition(column, node.match, params) };
    }

    throw new Error("Invalid QueryNode");
  }
}