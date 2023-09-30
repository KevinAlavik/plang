#!/usr/bin/env node
import { Lexer } from "./syntax-analysis/lexer";
import { readln } from "./lib/utilities";

async function main() {
    console.log("Welcome to the PLANG repl!");

    while (true) {
        const code = await readln("> ");
        if (!code.trim()) continue;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        console.log(tokens);
    }
}

main().catch((error) => {
    console.error('An error occurred:', error);
});
