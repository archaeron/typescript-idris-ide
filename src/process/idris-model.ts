import IdrisIdeMode from './idris-ide-mode'
import { Subject, Observable } from '@reactivex/rxjs'
//import JS from './utils/js'
import * as path from 'path'
import { CompilerOptions } from './types'
import { IdrisMessage } from '../protocol/types'
import { Exp } from '../protocol/types'

class IdrisModel {
    requestId: number = 0
    ideModeRef: IdrisIdeMode
    subjects: Subject<any>[] = []
    warnings: {}
    compilerOptions: CompilerOptions
    oldCompilerOptions: {}

    ideMode(compilerOptions: CompilerOptions) {
        // if (this.ideModeRef && !JS.objectEqual(this.oldCompilerOptions, compilerOptions)) {
        //     this.ideModeRef.process.removeAllListeners()
        //     this.ideModeRef.stop()
        //     this.ideModeRef = null
        // }
        if (!this.ideModeRef) {
            this.ideModeRef = new IdrisIdeMode
            this.ideModeRef.on('message', this.handleCommand)
            this.ideModeRef.start(compilerOptions)
            this.oldCompilerOptions = compilerOptions
        }
        return this.ideModeRef
    }

    stop() {
        if (this.ideModeRef) {
            this.ideModeRef.stop()
        }
    }

    setCompilerOptions(compilerOptions: CompilerOptions) {
        this.compilerOptions = compilerOptions
    }

    handleCommand(cmd: IdrisMessage) {
        let list = cmd.sexp.value;
        if (list.length > 2 && list[0].kind == "sym" && list[-1].kind == "num") {
            let op = <string>list[0].value;
            let id = <number>list[-1].value;
            let params = list.slice(1, -1)
            if (this.subjects[id]) {
                let subject = this.subjects[id]
                switch (op) {
                    case ':return':
                        {
                            let ret = params[0];
                            if (ret[0] == ':ok') {
                                let okparams = ret[1]
                                if (okparams[0] == ':metavariable-lemma') {
                                    subject.onNext(
                                        {
                                            responseType: 'return',
                                            msg: okparams
                                        });
                                }
                                else {
                                    subject.onNext({
                                        responseType: 'return',
                                        msg: ret.slice(1)
                                    });
                                }
                            }
                            else {
                                subject.onError({
                                    message: ret[1],
                                    warnings: this.warnings[id],
                                    highlightInformation: ret[2],
                                    cwd: this.compilerOptions.src
                                });
                            }
                            subject.onCompleted()
                            delete this.subjects[id]
                            break;
                        }
                    case ':write-string':
                        {
                            let msg = params[0];
                            subject.onNext({
                                responseType: 'write-string',
                                msg: msg
                            });
                            break;
                        }
                    case ':warning':
                        {
                            let warning = params[0];
                            this.warnings[id].push(warning);
                            break;
                        }
                    case ':set-prompt':
                        {
                            // Ignore
                            break;
                        }
                    default:
                        {
                            console.log(op, params);
                            break;
                        }
                }
            }
        }
    }

    getUID() {
        return ++this.requestId;
    }

    prepareCommand(cmd: Exp) {
        const id = this.getUID()
        let subject = new Subject
        this.subjects[id] = subject
        this.warnings[id] = []
        this.ideMode(this.compilerOptions).send(
            {
                kind: "list",
                value: [cmd, { kind: "num", value: id }]
            }
        );
        return subject;
    }

    changeDirectory(dir: string) {
        this.interpret(`:cd ${dir}`)
    }

    load(uri: string) {
        let dir: string;
        let cd;

        if (this.compilerOptions.src) {
            dir = this.compilerOptions.src
        }
        else {
            dir = path.dirname(uri)
        }

        if (dir != this.compilerOptions.src) {
            this.compilerOptions.src = dir
            cd = this.changeDirectory(dir).map(() => dir)
        }
        else {
            cd = Observable.of(dir)
        }

        cd.flatMap(() => this.prepareCommand([':load-file', uri]));
    }

    docsFor(word: string) {
        this.prepareCommand([':docs-for', word])
    }

    replCompletions(word: string) {
        this.prepareCommand([':repl-completions', word])
    }

    getType(word: string) {
        this.prepareCommand([':type-of', word])
    }

    caseSplit(line: number, word: string) {
        this.prepareCommand([':case-split', line, word]);
    }

    makeWith(line: number, word: string) {
        this.prepareCommand([':make-with', line, word]);
    }

    makeLemma(line: number, word: string) {
        this.prepareCommand([':make-lemma', line, word]);
    }

    interpret(code: string) {
        this.prepareCommand([':interpret', code]);
    }

    makeCase(line: number, word: string) {
        this.prepareCommand([':make-case', line, word]);
    }

    addClause(line: number, word: string) {
        this.prepareCommand([':add-clause', line, word]);
    }

    holes(width: number) {
        this.prepareCommand([':metavariables', width]);
    }

    proofSearch(line: number, word: string) {
        this.prepareCommand([':proof-search', line, word, []]);
    }

    printDefinition(name: string) {
        this.prepareCommand([':print-definition', name]);
    }

    apropos(name: string) {
        this.prepareCommand([':apropos', name]);
    }
}

module.exports = IdrisModel