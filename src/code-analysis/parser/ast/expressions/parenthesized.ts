import { Token } from "../../../syntax/token";
import { ValueType } from "../../../type-checker";
import AST from "..";

export class ParenthesizedExpression extends AST.Expression {
  public constructor(
    public readonly expression: AST.Expression
  ) { super(); }

  public accept<R>(visitor: AST.Visitor.Expression<R>): R {
    return visitor.visitParenthesizedExpression(this);
  }

  public get token(): Token {
    return this.expression.token;
  }
}