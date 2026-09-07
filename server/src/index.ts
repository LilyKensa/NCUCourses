import { startCli } from "./cli";
import { Core } from "./core";
import { startServer } from "./server";

Core.load();

startServer();
startCli();