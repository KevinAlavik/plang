# PLang
The P programming language

![Last Commit](https://img.shields.io/github/last-commit/p-programming-language/plang
) ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/p-programming-language/plang) ![GitHub top language](https://img.shields.io/github/languages/top/p-programming-language/plang) ![Lines of Code](https://img.shields.io/tokei/lines/github/p-programming-language/plang)


![GitHub](https://img.shields.io/github/license/p-programming-language/plang)

[![testing](https://github.com/KevinAlavik/plang/actions/workflows/test.yml/badge.svg)](https://github.com/KevinAlavik/plang/actions/workflows/test.yml) [![njsscan sarif](https://github.com/p-programming-language/plang/actions/workflows/njsscan.yml/badge.svg)](https://github.com/p-programming-language/plang/actions/workflows/njsscan.yml) [![Daily Release](https://github.com/p-programming-language/plang/actions/workflows/daily-release.yml/badge.svg)](https://github.com/p-programming-language/plang/actions/workflows/daily-release.yml)
## Why?
becuz im bored
## Tools
- gpc
    - The general Plang compiler
- prepl
    - A interactive repl to run plang in your terminal
- ppl
    - A P Package library / project handler
### Developer only tools
- test
    - Runs a simple test on plang

## Installation
### On unix/linux:
```bash
curl -sSL https://raw.githubusercontent.com/KevinAlavik/plang/main/install.sh | bash
```
### On Windows
Powershell:
```powershell
Invoke-Expression (Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/KevinAlavik/plang/main/install.ps1').Content
```
Command prompt:
```bash
powershell -command "& { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/KevinAlavik/plang/main/install.bat' -OutFile 'install.bat'; .\install.bat; Remove-Item -Path 'install.bat' }"
```
### Building from source:
Simply run:
```bash
npm run build
```
or:
```bash
yarn run build
```
**Then you can access are [tools](https://github.com/kevinalavik/plang?tab=readme-ov-file#tools) using:**
```bash
npm run <tool>
```
or:
```bash
yarn run <tool>
```
## Current features
- Tokenizing:
    - Number literals (int, float)
    - String literals, supports both single and double quotes
    - Boolean literals
    - Identifiers
    - Keywords
    - Most symbols (`.`, `:`, `<`, `<=`, `>`, `>=`, all brackets, arithmetic operators, etc.)
- Parsing + Binding + Type checking:
    - Literals
    - Binary expressions
    - Unary expressions
    - Variable declarations
    - Variable assignment (`:=` and `=` operators)

---
**ATM it's only a tokenizer, parser, binder, and type checker. Support for functions, classes, etc. soon.**
