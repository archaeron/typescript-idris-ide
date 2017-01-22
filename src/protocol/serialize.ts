import { Exp } from './types'

function formatExp(e: Exp): string {
    switch (e.kind) {
        case "num":
            return e.value.toString();
        case "str":
            return '"' + e.value + '"';
        case "sym":
            return ":" + e.value
        case "bool":
            if (e.value) { return ":True" } else { return ":False" }
        case "list":
            console.log("serialize a list", e.value, e.value.map(formatExp));
            return '(' + e.value.map(formatExp).join(' ') + ')';
    }
}

/**
 *  Returns a 0-padded 6-char long hexadecimal
 * for the length of the input `str`
 */
function hexLength(str: string) {
    let hex = str.length.toString(16)
    return Array(7 - (hex.length)).join('0') + hex
}

export default function serialize(e: Exp): string {
    let msg = formatExp(e);
    return hexLength(msg) + msg;
}