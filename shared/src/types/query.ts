export enum MatchOp {
  EQ = "eq", 
  NEQ = "neq", 
  GT = "gt", 
  GTE = "gte", 
  LT = "lt", 
  LTE = "lte", 
  INCLUDES = "includes", 
  IN = "in"
}

export interface MatchCondition {
  op: MatchOp;
  value: any;
}

export interface ScalarCondition {
  field: string;
  match: MatchCondition;
}

export interface ArrayCondition {
  field: string;
  op: "any" | "all";
  each: MatchCondition;
}

export type LogicalNode =
  | { and: QueryNode[] }
  | { or: QueryNode[] }
  | { not: QueryNode };

export type QueryNode = LogicalNode | ScalarCondition | ArrayCondition;

export const SCALAR_FIELDS: Record<string, string> = {
  id: "c.id",
  classNumber: "c.classNumber",
  title: "c.title",
  credits: "c.credits",
  people_limit: "c.people_limit",
  people_admitted: "c.people_admitted",
  people_applying: "c.people_applying",
  passwordCard: "c.passwordCard",
  department: "c.department",
  targetDegree: "c.targetDegree",
  language: "c.language"
};

export const ARRAY_FIELDS: Record<string, string> = {
  teachers: "course_teachers",
  clocks: "course_clocks",
  classrooms: "course_classrooms"
};