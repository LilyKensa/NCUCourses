import * as readline from "node:readline";
import { NCUInterface } from "./lib/ncu-interface";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "",
});

rl.on("line", async (line) => {
  const input = line.trim();
  const [command, ...args] = input.split(/\s+/);

  switch (command.toLowerCase()) {
    case "help": {
      console.log("Available commands:");
      console.log("  update - Re-fetch the database");
      break;
    }
    case "update": {
      NCUInterface.updateDatabase();
      break;
    }
    case "check": {
      NCUInterface.check();
    }
    case "": {
      break;
    }
    default: {
      console.log(`Unknown command: "${command}". Type "help" for a list of commands.`);
      break;
    }
  }

  rl.prompt();
});

export const startCli = async () => {
  rl.prompt();
};