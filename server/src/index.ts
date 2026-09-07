import { startCli } from "./cli";
import { Db } from "./database";
import { startServer } from "./server";

startServer();
startCli();

function cleanup() {
  console.log("Shutting down...");
  Db.close();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);