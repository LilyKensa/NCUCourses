import fs from "node:fs";
import Path from "node:path";
import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { Course } from "@ncu-courses/shared/types";

interface CourseRow {
  id: number;
  classNumber: string;
  title: string;
  teacher: string;
  clocks: string;
  classrooms: string;
  credits: number;
  people_limit: number;
  people_admitted: number;
  people_applying: number;
  passwordCard: number;
  department: string;
  targetDegree: number;
  language: number;
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

    db.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY,
        classNumber TEXT NOT NULL,
        title TEXT NOT NULL,
        teacher TEXT NOT NULL,
        clocks TEXT NOT NULL,
        classrooms TEXT NOT NULL,
        credits REAL NOT NULL,
        people_limit INT NOT NULL,
        people_admitted INT NOT NULL,
        people_applying INT NOT NULL,
        passwordCard TINYINT NOT NULL,
        department TEXT NOT NULL,
        targetDegree TINYINT NOT NULL,
        language TINYINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(department);
      CREATE INDEX IF NOT EXISTS idx_courses_classNumber ON courses(classNumber);
    `);

    this.db = db;
    return db;
  }

  // --- Row Transformers ---

  private static toRow(course: Course): CourseRow {
    return {
      id: course.id,
      classNumber: course.classNumber,
      title: course.title,
      credits: course.credits,
      passwordCard: Number(course.passwordCard),
      department: course.department,
      targetDegree: Number(course.targetDegree),
      language: Number(course.language),
      teacher: JSON.stringify(course.teacher),
      clocks: JSON.stringify(course.clocks),
      classrooms: JSON.stringify(course.classrooms),
      people_limit: course.people.limit,
      people_admitted: course.people.admitted,
      people_applying: course.people.applying,
    };
  }

  private static toCourse(row: CourseRow): Course {
    return {
      ...row,
      teacher: JSON.parse(row.teacher),
      clocks: JSON.parse(row.clocks),
      classrooms: JSON.parse(row.classrooms),
      people: {
        limit: row.people_limit,
        admitted: row.people_admitted,
        applying: row.people_applying
      },
      passwordCard: row.passwordCard as Course["passwordCard"],
      targetDegree: row.targetDegree as Course["targetDegree"],
      language: row.language as Course["language"],
    };
  }

  // --- CRUD Operations ---

  static add(course: Course): void {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO courses (
        id, classNumber, title, teacher, clocks, classrooms,
        credits, people_limit, people_admitted, people_applying, passwordCard, department, targetDegree, language
      ) VALUES (
        @id, @classNumber, @title, @teacher, @clocks, @classrooms,
        @credits, @people_limit, @people_admitted, @people_applying,  @passwordCard, @department, @targetDegree, @language
      )
    `);
    stmt.run(this.toRow(course));
  }

  static addMany(courses: Course[]): void {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO courses (
        id, classNumber, title, teacher, clocks, classrooms,
        credits, people_limit, people_admitted, people_applying,  passwordCard, department, targetDegree, language
      ) VALUES (
        @id, @classNumber, @title, @teacher, @clocks, @classrooms,
        @credits, @people_limit, @people_admitted, @people_applying, @passwordCard, @department, @targetDegree, @language
      )
    `);

    const insertTransaction = db.transaction((items: Course[]) => {
      for (const item of items) {
        stmt.run(this.toRow(item));
      }
    });

    insertTransaction(courses);
  }

  static getById(id: number): Course | null {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(id) as CourseRow | undefined;
    return row ? this.toCourse(row) : null;
  }

  static getByClassNumber(classNumber: string): Course | null {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM courses WHERE classNumber = ?").get(classNumber) as CourseRow | undefined;
    return row ? this.toCourse(row) : null;
  }

  static getByDepartment(department: string): Course[] {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM courses WHERE department = ?").all(department) as CourseRow[];
    return rows.map((r) => this.toCourse(r));
  }

  static getAll(): Course[] {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM courses").all() as CourseRow[];
    return rows.map((r) => this.toCourse(r));
  }

  static remove(id: number): boolean {
    const db = this.getDb();
    const result = db.prepare("DELETE FROM courses WHERE id = ?").run(id);
    return result.changes > 0;
  }

  static removeByClassNumber(classNumber: string): boolean {
    const db = this.getDb();
    const result = db.prepare("DELETE FROM courses WHERE classNumber = ?").run(classNumber);
    return result.changes > 0;
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

  static getAllKeys() {
    const db = this.getDb();
    const stmt = db.prepare("SELECT id FROM courses");
    const rows = stmt.all() as { id: Course["id"] }[];
    return new Set(rows.map(row => row.id));
  }

  static close(): void {
    if (!this.db) return;
    this.db.close();
    this.db = null;
  }
}