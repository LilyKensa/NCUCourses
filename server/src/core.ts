import fs from "node:fs";
import Path from "node:path";

import { Course } from "@ncu-courses/shared/types";

export class Core {
  static dataFolder = Path.join(import.meta.dirname, "../data");
  static coursesFile = Path.join(this.dataFolder, "courses.json");

  static courses: Course[] = [];

  static async load() {
    if (!fs.existsSync(this.coursesFile)) return;
    this.courses = JSON.parse(String(await fs.promises.readFile(this.coursesFile)));
  }

  static async save(filename = this.coursesFile) {
    await fs.promises.mkdir(this.dataFolder, { recursive: true });
    await fs.promises.writeFile(filename, JSON.stringify(Core.courses, null, 2));
  }
}