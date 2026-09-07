import { Course } from "./database";

const allowedColumnsList = [
  "id", "classNumber", "title",
  "teacher", "clocks", "classrooms",
  "credits", "people_limit", "people_admitted",
  "people_applying", "passwordCard", "department",
  "targetDegree", "language",
] as (keyof Course)[];
export const allowedColumns = new Set(allowedColumnsList);

export type QueryColumn = typeof allowedColumnsList[number];

export const operatorMap = {
  eq: "=",
  neq: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  in: "IN"
};

export type QueryOperator = keyof typeof operatorMap;

type QueryOperatorValueMap<Col extends QueryColumn> = {
  ["eq"]: Course[Col];
  ["neq"]: Course[Col];
  ["gt"]: Course[Col];
  ["gte"]: Course[Col];
  ["lt"]: Course[Col];
  ["lte"]: Course[Col];
  ["in"]: Course[Col][];
};

export interface FieldCondition<Col extends QueryColumn, Op extends QueryOperator> {
  field: Col;
  op: Op;
  value: QueryOperatorValueMap<Col>[Op];
}

export type AnyFieldCondition = {
  [Col in QueryColumn]: {
    [Op in QueryOperator]: FieldCondition<Col, Op>;
  }[QueryOperator];
}[QueryColumn];

export interface LogicalGroup {
  and?: QueryNode[];
  or?: QueryNode[];
  not?: QueryNode;
}

export type QueryNode = LogicalGroup | AnyFieldCondition;