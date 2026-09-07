export enum PasswordCard {
  NONE,
  OPTIONAL,
  ALL
}

export enum Degree {
  BACHELOR,
  MASTER,
  DOCTERATE,
  WORKING_MASTER,
  MASTER_AND_DOCTERATE,
  TEACHER
}

export enum Language {
  CHINESE,
  HAKKA,
  FRENCH,
  ENGLISH,
  PARTIAL_ENGLISH,
  JAPANESE,
  PARTIAL_HAKKA
}

export interface SimpleCourse {
  id: number;
  classNumber: string;
  title: string;
  teacher: string[];
  clocks: number[];
  classrooms: string[];
  credits: number;
  people: {
    limit: number;
    admitted: number;
    applying: number;
  };
  passwordCard: PasswordCard;
  department: string;
  targetDegree: Degree;
  language: Language;
}

export interface Course extends SimpleCourse {

}