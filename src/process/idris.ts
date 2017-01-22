import * as child_process from "child_process";
import * as readline from "readline";

export default class Idris
{
    private process: child_process.ChildProcess;
    public readline: readline.ReadLine;

    constructor()
    {
        this.process = child_process.spawn("idris", ["--ide-mode"]);
        this.process.on("error", (error : Error & { code : string }) =>
            {
                if(error.code === "ENOENT")
                {
                    console.log("can't find idris");
                }
            }
        );
        this.readline = readline.createInterface(
            {
                input: this.process.stdout,
                output: this.process.stdin,
                terminal: true,
            }
        );
        this.readline.setPrompt("");
    }
}