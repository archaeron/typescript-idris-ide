//Logger = require './Logger'
import serialize from '../protocol/serialize';
import parse from '../protocol/parse';
import { ChildProcess, spawn } from 'child_process';
import { CompilerOptions } from './types'
import { Exp } from '../protocol/types'
import { EventEmitter } from 'events'

export default class IdrisIdeMode extends EventEmitter {
    process: ChildProcess
    processRunning: boolean = false
    buffer: string = ""
    idrisBuffers: number = 0

    start(compilerOptions: CompilerOptions) {
        if ((!this.process) || (!this.process.connected)) {
            let pathToIdris = "idris";
            let pkgs;
            let options: string[];

            if (compilerOptions.pkgs && compilerOptions.pkgs.length) {
                const p = [].map((p) => ["-p", p]); // TODO: compilerOptions
                pkgs = [].concat.apply([], p);
            }
            else {
                pkgs = [];
            }

            if (compilerOptions.options) {
                options = compilerOptions.options.split(' ')
            }
            else {
                options = []
            }

            const parameters = ['--ide-mode'].concat(pkgs, options)

            const cwdOptions = compilerOptions.src ? { cwd: compilerOptions.src } : {};
            console.log("spawn opts", pathToIdris, parameters, cwdOptions);
            this.process = spawn(pathToIdris, parameters, cwdOptions);
            this.processRunning = true;
            this.process.on('error', this.error)
            this.process.on('exit', this.exited)
            this.process.on('close', this.exited)
            this.process.on('disconnect', this.exited)

            this.process.stdout.setEncoding('utf8');
            this.process.stdout.on('data', this.stdout);

            this.process.stdout.setEncoding('utf8');
            this.process.stdout.on("data", (err) => console.log("idris err", err))
        }
    }

    send(cmd: Exp) {
        console.log("sending", cmd);
        console.log(serialize(cmd));
        // Logger.logOutgoingCommand cmd
        this.process.stdin.write(serialize(cmd))
    }

    public stop() {
        if (this.process) {
            this.process.kill();
        }
    }

    error(error: { code: string, message: string }) {
        let e;
        if (error.code == 'ENOENT') {
            e = {
                short: "Couldn't find idris executable",
                long: "Couldn't find idris executable at \"#{error.path}\""
            };
        }
        else {
            e = {
                short: error.code,
                long: error.message
            };
        }
        this.emit("error", e);
    }

    exited(_code: number, signal: string) {
        if (signal == "SIGTERM") {
            const short = "The idris compiler was closed";
            const long = "You stopped the compiler";
            let message = { short, long };
            this.emit("info", message);
        }
        else {
            const short = "The idris compiler was closed or crashed";

            if (signal) {
                var long = "It was closed with the signal: #{signal}"
            }
            else {
                var long = "It (probably) crashed with the error code: #{code}"
            }
            let message = { short, long };
            this.emit("error", message);
        }
        this.processRunning = false;
    }

    running() {
        return !!this.process;
    }

    stdout(data: string) {
        this.buffer += data
        while (this.buffer.length > 6) {

            this.buffer = this.buffer.replace(/\r\n/g, "\n");
            // We have 6 chars, which is the length of the command
            let len = parseInt(this.buffer.substr(0, 6), 16);
            if (this.buffer.length >= 6 + len) {
                // We also have the length of the command in the buffer, so
                // let's read in the command
                let cmd = this.buffer.substr(6, len).trim();
                // Logger.logIncomingCommand(cmd)
                // Remove the length + command from the buffer
                this.buffer = this.buffer.substr(6 + len);
                // And then we can try to parse to command..
                let obj = parse(cmd.trim());
                this.emit("message", obj)
            }
            else {
                // We didn't have the entire command, so let's break the
                // while-loop and wait for the next data-event
                break
            }
        }
    }

}
