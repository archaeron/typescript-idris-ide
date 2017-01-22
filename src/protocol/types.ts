export type Exp = Num | Str | Sym | Bool | List

export interface Num {
    kind: "num"
    value: number
}

export function mkNum(num: number) {
    return { kind: "num", value: num }
}

export interface Str {
    kind: "str"
    value: string
}
export interface Sym {
    kind: "sym"
    value: string
}
export interface Bool {
    kind: "bool"
    value: boolean
}
export interface List {
    kind: "list"
    value: Exp[]
}

export interface IdrisMessage {
    msgLength: number,
    sexp: List
}