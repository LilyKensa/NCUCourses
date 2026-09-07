import fs from "node:fs";
import Path from "node:path";
import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { Course } from "@ncu-courses/shared/types/database";
import { Query } from "./lib/query";
import { QueryNode } from "@ncu-courses/shared/types/query";

interface CourseRow {
  id: number;
  classNumber: string;
  title: string;
  credits: number;
  people_limit: number;
  people_admitted: number;
  people_applying: number;
  passwordCard: number;
  department: string;
  targetDegree: number;
  language: number;
  // Aggregated via json_group_array
  teachers?: string;
  clocks?: string;
  classrooms?: string;
}

export class Db {

  static dataFolder = Path.join(import.meta.dirname, "../data");
  static dbFile = Path.join(this.dataFolder, "courses.db");
  static db: DatabaseType | null = null;

  static getDb(filePath = this.dbFile): DatabaseType {
    if (this.db) return this.db;

    if (!fs.existsSync(this.dataFolder)) {
      fs.mkdirSync(this.dataFolder, { recursive: true });
    }

    const db = new Database(filePath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY,
        classNumber TEXT NOT NULL,
        title TEXT NOT NULL,
        credits REAL NOT NULL,
        people_limit INT NOT NULL,
        people_admitted INT NOT NULL,
        people_applying INT NOT NULL,
        passwordCard TINYINT NOT NULL,
        department TEXT NOT NULL,
        targetDegree TINYINT NOT NULL,
        language TINYINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS course_teachers (
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        prop TEXT NOT NULL,
        PRIMARY KEY (course_id, prop)
      );

      CREATE TABLE IF NOT EXISTS course_clocks (
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        prop TEXT NOT NULL,
        PRIMARY KEY (course_id, prop)
      );

      CREATE TABLE IF NOT EXISTS course_classrooms (
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        idx INTEGER NOT NULL,
        prop TEXT NOT NULL,
        PRIMARY KEY (course_id, idx)
      );

      CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(department);
      CREATE INDEX IF NOT EXISTS idx_courses_classNumber ON courses(classNumber);
      CREATE INDEX IF NOT EXISTS idx_teachers_val ON course_teachers(prop);
      CREATE INDEX IF NOT EXISTS idx_clocks_val ON course_clocks(prop);
      CREATE INDEX IF NOT EXISTS idx_classrooms_val ON course_classrooms(prop);
    `);

    this.db = db;
    return db;
  }

  // --- Row Transformers ---

  private static toRow(course: Course): Omit<CourseRow, "teachers" | "clocks" | "classrooms"> {
    return {
      id: course.id,
      classNumber: course.classNumber,
      title: course.title,
      credits: course.credits,
      people_limit: course.people.limit,
      people_admitted: course.people.admitted,
      people_applying: course.people.applying,
      passwordCard: Number(course.passwordCard),
      department: course.department,
      targetDegree: Number(course.targetDegree),
      language: Number(course.language),
    };
  }

  private static toCourse(row: CourseRow): Course {
    return {
      id: row.id,
      classNumber: row.classNumber,
      title: row.title,
      credits: row.credits,
      department: row.department,
      teachers: row.teachers ? JSON.parse(row.teachers) : [],
      clocks: row.clocks ? JSON.parse(row.clocks) : [],
      classrooms: row.classrooms ? JSON.parse(row.classrooms) : [],
      people: {
        limit: row.people_limit,
        admitted: row.people_admitted,
        applying: row.people_applying,
      },
      passwordCard: row.passwordCard as Course["passwordCard"],
      targetDegree: row.targetDegree as Course["targetDegree"],
      language: row.language as Course["language"],
    };
  }

  // --- CRUD Operations ---

  static addMany(courses: Course[]): void {
    const db = this.getDb();

    const insertCourse = db.prepare(`
      INSERT OR REPLACE INTO courses (
        id, classNumber, title, credits, people_limit, people_admitted,
        people_applying, passwordCard, department, targetDegree, language
      ) VALUES (
        @id, @classNumber, @title, @credits, @people_limit, @people_admitted,
        @people_applying, @passwordCard, @department, @targetDegree, @language
      )
    `);

    // Clear and repopulate child rows on REPLACE
    const delTeachers = db.prepare(`DELETE FROM course_teachers WHERE course_id = ?`);
    const delClocks = db.prepare(`DELETE FROM course_clocks WHERE course_id = ?`);
    const delClassrooms = db.prepare(`DELETE FROM course_classrooms WHERE course_id = ?`);

    const insTeacher = db.prepare(`INSERT OR IGNORE INTO course_teachers (course_id, prop) VALUES (?, ?)`);
    const insClock = db.prepare(`INSERT OR IGNORE INTO course_clocks (course_id, prop) VALUES (?, ?)`);
    const insClassroom = db.prepare(`INSERT INTO course_classrooms (course_id, idx, prop) VALUES (?, ?, ?)`);

    const insertTransaction = db.transaction((items: Course[]) => {
      for (const item of items) {
        insertCourse.run(this.toRow(item));

        delTeachers.run(item.id);
        for (const t of item.teachers) 
          insTeacher.run(item.id, String(t));

        delClocks.run(item.id);
        for (const c of item.clocks) 
          insClock.run(item.id, String(c));

        delClassrooms.run(item.id);
        item.classrooms.forEach((cr, idx) => insClassroom.run(item.id, idx, String(cr)));
      }
    });

    insertTransaction(courses);
  }

  static clear(): void {
    const db = this.getDb();
    db.prepare("DELETE FROM courses").run();
  }

  static count(): number {
    const db = this.getDb();
    const row = db.prepare("SELECT COUNT(*) as total FROM courses").get() as { total: number };
    return row.total;
  }

  static getAllKeys(): Set<number> {
    const db = this.getDb();
    const stmt = db.prepare("SELECT id FROM courses");
    const rows = stmt.all() as Pick<Course, "id">[];
    return new Set(rows.map((row) => row.id));
  }

  static close(): void {
    if (!this.db) return;
    this.db.close();
    this.db = null;
  }

  static query(filter?: QueryNode, limit = 100, offset = 0): Course[] {
    const db = this.getDb();

    let matcherSql = `SELECT c.id FROM courses c`;
    const params: any[] = [];

    if (filter) {
      const { sql } = Query.buildWhereClause(filter, params);
      matcherSql += ` WHERE ${sql}`;
    }

    matcherSql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const finalSql = `
      SELECT 
        c.*,
        COALESCE((SELECT json_group_array(prop) FROM course_teachers WHERE course_id = c.id), '[]') as teachers,
        COALESCE((SELECT json_group_array(prop) FROM course_clocks WHERE course_id = c.id), '[]') as clocks,
        COALESCE((SELECT json_group_array(prop) FROM course_classrooms WHERE course_id = c.id ORDER BY idx), '[]') as classrooms
      FROM courses c
      WHERE c.id IN (${matcherSql})
    `;

    const stmt = db.prepare(finalSql);
    const rows = stmt.all(...params) as CourseRow[];

    return rows.map((r) => this.toCourse(r));
  }
}