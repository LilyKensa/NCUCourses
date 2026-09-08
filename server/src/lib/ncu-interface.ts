import * as XmlJs from "xml-js";
import { Utils } from "./utils";
import { Course, Degree, Language, PasswordCard } from "@ncu-courses/shared/types/database";
import { Db } from "../database";
import * as cheerio from "cheerio";
import { Config } from "@ncu-courses/shared/config";

export namespace NCUInterface {

  export async function updateDatabase() {
    const visited = Db.getAllKeys();

    for (let w of Config.NCU.weekdays) {
      for (let c of Config.NCU.clocks) {
        const courses: Course[] = [];

        const data = await fetch(`${Config.NCU.listEndpoint}?id=daysection_${w}_${c}`, {
          headers: Utils.fetchHeaders
        }).then(res => res.text());
        const elements: XmlJs.Element[] = XmlJs.xml2js(data).elements[0].elements;
        if (!elements) continue;

        async function run(el: XmlJs.Element) {
          let get = (key: string) => el.attributes![key] as string;
          let getInt = (key: string) => Number.parseInt(get(key));

          const id = getInt("SerialNo");
          if (visited.has(id)) return;

          let details = await fetchDetails(id);

          courses.push({
            id,
            classNumber: get("ClassNo"),
            title: get("Title"),
            teachers: get("Teacher").split(", "),
            clocks: get("ClassTime").split(","),
            classrooms: details["時間/教室"].split(/\n/g).filter(line => line.match(/\|/g)).map(line => line.split("|")[1].trim()),
            credits: getInt("credit"),
            people: {
              limit: getInt("limitCnt"),
              admitted: getInt("admitCnt"),
              applying: getInt("waitCnt")
            },
            passwordCard: Utils.enumerate({
              NONE: PasswordCard.NONE,
              OPTIONAL: PasswordCard.OPTIONAL,
              ALL: PasswordCard.ALL
            }, get("passwordCard")),
            department: details["開課單位"],
            targetDegree: Utils.enumerate({
              "學士班": Degree.BACHELOR,
              "碩士班": Degree.MASTER,
              "博士班": Degree.DOCTERATE,
              "碩士在職專班": Degree.WORKING_MASTER,
              "碩博同修": Degree.MASTER_AND_DOCTERATE,
              "師資培育": Degree.TEACHER
            }, details["課程學制"], Degree.NONE),
            required: details["選修別"] === "必修",
            language: Utils.enumerate({
              "國語": Language.CHINESE,
              "英語": Language.ENGLISH,
              "客語": Language.HAKKA,
              "法語": Language.FRENCH,
              "部分英語": Language.PARTIAL_ENGLISH,
              "日語": Language.JAPANESE,
              "部份客語": Language.PARTIAL_HAKKA
            }, details["授課語言"])
          });
          visited.add(id);
        }

        let promises = [];
        for (let el of elements) {
          promises.push(run(el));
        }
        await Promise.all(promises);

        Db.addMany(courses);
        console.log(`Done ${w}-${c}`);
      }
    }
  }

  export async function fetchDetails(id: number) {
    const result: Record<string, string> = {};

    const data = await fetch(`${Config.NCU.detailEndpoint}?crs=${id}`, {
      headers: Utils.fetchHeaders
    }).then(res => res.text());
    const $ = cheerio.load(data);

    $(".classBase > tbody > tr").each((i, tr) => {
      const tdList = $(tr).find("> td");
      if (tdList.length < 2) return;

      function format($el: cheerio.Cheerio<any>) {
        $el.find("br").replaceWith("_%_newline_%_");
        return $el.text().trim().replace(/[\s\n]+/g, " ").replace(/_%_newline_%_/g, "\n")
      }

      const $key = $(tdList.get(0)), $value = $(tdList.get(1));
      const key = format($key), value = format($value);
      
      result[key] = value;
    });

    return result;
  }

  export async function check() {
    
  }
}