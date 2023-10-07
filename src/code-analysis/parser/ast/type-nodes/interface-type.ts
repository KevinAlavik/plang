import type { Token } from "../../../tokenization/token";
import type { InterfacePropertySignature } from "../../../type-checker";
import type { LiteralExpression } from "../expressions/literal";
import AST from "..";

export class InterfaceTypeExpression extends AST.TypeRef {
  public constructor(
    public readonly name: Token<undefined>,
    public readonly properties: Map<LiteralExpression<string>, InterfacePropertySignature<AST.TypeRef>>,
    public readonly indexSignatures: Map<AST.TypeRef, AST.TypeRef>
  ) { super(); }

  public get token(): Token {
    return this.name;
  }
}