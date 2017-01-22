import * as chevrotain from "chevrotain"
import { Exp, Num, Str, Sym, Bool, List, IdrisMessage } from './types'

var Lexer = chevrotain.Lexer;
var Parser = chevrotain.Parser;

class TrueTok extends chevrotain.Token {
    static PATTERN = /:True/
}

class FalseTok extends chevrotain.Token {
    static PATTERN = /:False/
}

class MsgLengthTok extends chevrotain.Token {
    static PATTERN = /0[0-9a-f]+/
}

class StringLitTok extends chevrotain.Token {
    static PATTERN = /"(?:[^\\"]+|\\(?:["\\/]))*"/
}

class OpenParensTok extends chevrotain.Token {
    static PATTERN = /\(/
}

class CloseParensTok extends chevrotain.Token {
    static PATTERN = /\)/
}

class SymbolTok extends chevrotain.Token {
    static PATTERN = /:[^ \)]+/
}

class SpaceTok extends chevrotain.Token {
    static PATTERN = /\s+/
}

class NumTok extends chevrotain.Token {
    static PATTERN = /0|[1-9]\d*/
}

let allTokens =
    [TrueTok
        , FalseTok
        , MsgLengthTok
        , NumTok
        , StringLitTok
        , OpenParensTok
        , CloseParensTok
        , SymbolTok
        , SpaceTok
    ]


class IdrisIdeProtocolParser extends chevrotain.Parser {
    constructor(input: chevrotain.Token[]) {
        super(input, allTokens)
        Parser.performSelfAnalysis(this)
    }

    public msg =
    this.RULE("msg", () => {
        let msgLength = this.SUBRULE(this.messageLength);
        let sexp = this.SUBRULE(this.sexp)
        return { msgLength, sexp }
    });

    public messageLength =
    this.RULE("messageLength", () => {
        let msgLength = this.CONSUME1(MsgLengthTok);
        return parseInt(chevrotain.getImage(msgLength), 16);
    });

    public sexp =
    this.RULE<List>("sexp", () => {
        this.CONSUME(OpenParensTok);
        let exp = this.SUBRULE1(this.atom);
        let exps = this.OPTION(() => {
            this.CONSUME(SpaceTok);
            return this.MANY_SEP1(SpaceTok, this.atom).values;
        }
        );
        this.CONSUME(CloseParensTok);
        return { kind: "list", value: [exp, ...exps] };
    });

    public atom: (idxInCallingRule?: number | undefined, ...args: any[]) => Exp =
    this.RULE<Exp>("atom", () => {
        let e: Exp = this.OR<Exp>(
            [{ ALT: () => this.SUBRULE(this.num) }
                , { ALT: () => this.SUBRULE(this.str) }
                , { ALT: () => this.SUBRULE(this.symbol) }
                , { ALT: () => this.SUBRULE(this.bool) }
                , { ALT: () => this.SUBRULE(this.sexp) }
            ]
        )
        return e;
    })

    public num =
    this.RULE<Num>("num", () => {
        let num = this.CONSUME1(NumTok);
        return { kind: "num", value: parseInt(chevrotain.getImage(num), 10) };
    })

    public str =
    this.RULE<Str>("str", () => {
        let strLit = chevrotain.getImage(this.CONSUME1(StringLitTok));
        return { kind: "str", value: strLit.substr(1, strLit.length - 2) };
    })

    public symbol =
    this.RULE<Sym>("symbol", () => {
        let symbol = chevrotain.getImage(this.CONSUME1(SymbolTok));
        return { kind: "sym", value: symbol.substr(1) };
    })

    public bool =
    this.RULE("bool", () => {
        return this.OR(
            [{ ALT: () => this.SUBRULE(this.trueLit) }
                , { ALT: () => this.SUBRULE(this.falseLit) }
            ]
        );
    })

    public trueLit =
    this.RULE<Bool>("trueLit", () => {
        this.CONSUME1(TrueTok);
        return { kind: "bool", value: true };
    })

    public falseLit =
    this.RULE<Bool>("falseLit", () => {
        this.CONSUME1(FalseTok);
        return { kind: "bool", value: false };
    })
}

let IdrisIdeProtocolLexer = new Lexer(allTokens);
let parser = new IdrisIdeProtocolParser([]);

export default function parse(input: string): IdrisMessage {

    let lexingResult = IdrisIdeProtocolLexer.tokenize(input);
    parser.input = lexingResult.tokens;
    var msg = parser.msg()

    const util = require('util')

    return msg;
}