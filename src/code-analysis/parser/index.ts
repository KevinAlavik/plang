
import { Token } from "../syntax/token";
import { ParserSyntaxError } from "../../errors";
import { ValueType } from "../type-checker";
import { fakeToken } from "../../utility";
import ArrayStepper from "../array-stepper";
import Lexer from "../syntax/lexer";
import Syntax from "../syntax/syntax-type";
import * as SyntaxSets from "../syntax/syntax-sets";
import AST from "./ast";

import { LiteralExpression } from "./ast/expressions/literal";
import { ParenthesizedExpression } from "./ast/expressions/parenthesized";
import { UnaryExpression } from "./ast/expressions/unary";
import { BinaryExpression } from "./ast/expressions/binary";
import { TernaryExpression } from "./ast/expressions/ternary";
import { IdentifierExpression } from "./ast/expressions/identifier";
import { VariableAssignmentExpression } from "./ast/expressions/variable-assignment";
import { CompoundAssignmentExpression } from "./ast/expressions/compound-assignment";
import { SingularTypeExpression } from "./ast/type-nodes/singular-type";
import { UnionTypeExpression } from "./ast/type-nodes/union-type";
import { CallExpression } from "./ast/expressions/call";
import { IndexExpression } from "./ast/expressions";
import { ExpressionStatement } from "./ast/statements/expression";
import { VariableAssignmentStatement } from "./ast/statements/variable-assignment";
import { VariableDeclarationStatement } from "./ast/statements/variable-declaration";
import { ArrayLiteralExpression } from "./ast/expressions/array-literal";
import { ArrayTypeExpression } from "./ast/type-nodes/array-type";
import { BlockStatement } from "./ast/statements/block";
import { PrintlnStatement } from "./ast/statements/println";
import { IfStatement } from "./ast/statements/if";
import { WhileStatement } from "./ast/statements/while";
import { PropertyAssignmentExpression } from "./ast/expressions/property-assignment";
import { FunctionDeclarationStatement } from "./ast/statements/function-declaration";
import { ReturnStatement } from "./ast/statements/return";
import { StringInterpolationExpression } from "./ast/expressions/string-interpolation";
import { ObjectLiteralExpression } from "./ast/expressions/object-literal";
const { UNARY_SYNTAXES, LITERAL_SYNTAXES, COMPOUND_ASSIGNMENT_SYNTAXES } = SyntaxSets;

type SyntaxSet = (typeof SyntaxSets)[keyof typeof SyntaxSets];

export default class Parser extends ArrayStepper<Token> {
  public readonly lexer: Lexer;
  private readonly typeScopes: string[][] = [
    ["int", "float", "string", "bool", "undefined", "null", "void", "any", "Array"]
  ];

  public constructor(source: string) {
    super();
    this.lexer = new Lexer(source);
    this.input = this.lexer.tokenize();
  }

  /**
   * Parses until the predicate returns true
   *
   * Predicate returns whether or not the parser is finished by default
   */
  public parse(until = () => this.isFinished): AST.Statement[] {
    const statements: AST.Statement[] = [];
    while (!until())
      statements.push(this.declaration());

    return statements;
  }

  /**
   * Parse a non-declaration statement
   */
  private parseStatement(): AST.Statement {
    if (this.match(Syntax.Println)) {
      const keyword = this.previous<undefined>();
      const expressions = this.parseExpressionList();
      return new PrintlnStatement(keyword, expressions);
    }

    if (this.match(Syntax.If, Syntax.Unless)) {
      const keyword = this.previous<undefined>();
      const condition = this.parseExpression();
      const body = this.parseStatement();
      const elseBranch = this.match(Syntax.Else) ? this.parseStatement() : undefined;
      return new IfStatement(keyword, condition, body, elseBranch);
    }

    if (this.match(Syntax.While, Syntax.Until)) {
      const keyword = this.previous<undefined>();
      const condition = this.parseExpression();
      const body = this.parseStatement();
      return new WhileStatement(keyword, condition, body);
    }

    if (this.match(Syntax.Return)) {
      const keyword = this.previous<undefined>();
      const expr = this.checkMultiple([Syntax.Semicolon, Syntax.RBrace, Syntax.EOF]) ?
        new LiteralExpression(fakeToken(Syntax.Undefined, "undefined"))
        : this.parseExpression();

      return new ReturnStatement(keyword, expr);
    }

    if (this.match(Syntax.LBrace)) {
      const brace = this.previous<undefined>();
      if (this.match(Syntax.RBrace))
        return new ExpressionStatement(new ObjectLiteralExpression(brace, new Map));

      if (this.check(Syntax.Identifier) && this.check(Syntax.Colon, 1))
        return new ExpressionStatement(this.parseObjectContents(brace));
      else if (this.check(Syntax.LBracket)) {
        let offset = 1;
        while (!this.check(Syntax.RBracket, offset))
          ++offset;

        if (this.check(Syntax.Colon, offset + 1))
          return new ExpressionStatement(this.parseObjectContents(brace));
      }

      return this.parseBlock();
    }

    return this.parseExpressionStatement();
  }

  /**
   * Parses a declaration statement like a class, variable, function, etc.
   */
  private declaration(): AST.Statement {
    if (this.checkType() && this.check(Syntax.Function, 1)) {
      const declaration = this.parseFunctionDeclaration();
      this.consumeSemicolons();
      return declaration;
    }

    if (this.atVariableDeclaration) {
      const declaration = this.parseVariableDeclaration();
      this.consumeSemicolons();
      return declaration;
    }

    const stmt = this.parseStatement();
    this.consumeSemicolons();
    return stmt;
  }

  private get atVariableDeclaration(): boolean {
    const nextSyntax = this.peek()?.syntax;
    const nextNextSyntax = this.peek(2)?.syntax;
    const isVariableDeclarationSyntax = (syntax?: Syntax) => syntax === Syntax.Identifier
      || syntax === Syntax.Pipe
      || syntax === Syntax.LBracket
      || syntax === Syntax.RBracket
      || syntax === Syntax.Question;

    return (this.check(Syntax.Mut) ? this.checkType(1) : this.checkType())
      && (isVariableDeclarationSyntax(nextSyntax) || isVariableDeclarationSyntax(nextNextSyntax));
  }

  private parseFunctionDeclaration(): AST.Statement {
    const returnType = this.parseType();
    const keyword = this.consume<undefined>(Syntax.Function);

    const identifierToken = this.consume<undefined>(Syntax.Identifier, "identifier");
    const parameters: VariableDeclarationStatement[] = [];
    if (this.match(Syntax.LParen)) {
      if (this.atVariableDeclaration) {
        parameters.push(this.parseVariableDeclaration());
        while (this.match(Syntax.Comma))
          parameters.push(this.parseVariableDeclaration());
      }
      this.consume(Syntax.RParen);
    }


    this.consume(Syntax.LBrace);
    const body = this.parseBlock();
    const declaration = new FunctionDeclarationStatement(keyword, identifierToken, returnType, parameters, body);
    this.consumeSemicolons();
    return declaration;
  }

  private parseVariableDeclaration(): VariableDeclarationStatement {
    const isMutable = this.match(Syntax.Mut);
    const type = this.parseType();
    const identifierToken = this.consume<undefined>(Syntax.Identifier, "identifier");
    const initializer = this.match(Syntax.Equal) ?
      this.parseExpression()
        : undefined;

    const identifier = new IdentifierExpression(identifierToken);
    return new VariableDeclarationStatement(type, identifier, isMutable, initializer);
  }

  private parseBlock(): BlockStatement {
    const brace = this.previous<undefined>();
    this.typeScopes.push([]);
    const statements = this.parse(() => this.match(Syntax.RBrace));
    this.typeScopes.pop();
    return new BlockStatement(brace, statements);
  }

  /**
   * Wraps an expression in a statement, acts as a singular expression
   */
  private parseExpressionStatement(): AST.Statement {
    const expr = this.parseExpression();
    this.consumeSemicolons();
    return expr instanceof AST.Expression ?
      new ExpressionStatement(expr)
      : expr;
  }

  private parseExpression(): AST.Expression {
    return <AST.Expression>this.parseTernary();
  }

  private parseTernary(): AST.Expression | AST.Statement {
    let left = this.parseVariableAssignment();

    while (this.match(Syntax.Question)) {
      const operator = this.previous<undefined>();
      const body = this.parseExpression();
      this.consume(Syntax.Colon, "':'");
      const elseBranch = this.parseExpression();
      left = new TernaryExpression(operator, <AST.Expression>left, body, elseBranch);
    }

    return left;
  }

  private parseVariableAssignment(): AST.Expression | AST.Statement {
    let left = this.parseCompoundAssignment();

    if (this.match(Syntax.Equal, Syntax.ColonEqual)) {
      const isStatement = this.check(Syntax.Equal, -1);
      const value = <AST.Expression>this.parseExpression();

      if (!this.isAssignmentTarget(left))
        throw new ParserSyntaxError("Invalid assignment target", this.current);

      if (left instanceof IdentifierExpression)
        return isStatement ?
          new VariableAssignmentStatement(left, value)
          : new VariableAssignmentExpression(left, value);
      else if (left instanceof IndexExpression)
        return new PropertyAssignmentExpression(left, value);
    }

    return left;
  }

  private parseCompoundAssignment(): AST.Expression {
    let left = this.parseLogicalOr();

    if (this.matchSet(COMPOUND_ASSIGNMENT_SYNTAXES)) {
      const operator = this.previous<undefined>();
      const right = this.parseIndex();
      if (!this.isAssignmentTarget(left))
        throw new ParserSyntaxError("Invalid compound assignment target", this.current);

      left = new CompoundAssignmentExpression(<IdentifierExpression | IndexExpression>left, right, operator);
    }

    return left;
  }

  private parseLogicalOr(): AST.Expression {
    let left = this.parseLogicalAnd();

    while (this.match(Syntax.PipePipe, Syntax.QuestionQuestion)) {
      const operator = this.previous<undefined>();
      const right = this.parseLogicalAnd();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseLogicalAnd(): AST.Expression {
    let left = this.parseComparison();

    while (this.match(Syntax.AmpersandAmpersand)) {
      const operator = this.previous<undefined>();
      const right = this.parseComparison();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseComparison(): AST.Expression {
    let left = this.parseEquality();

    while (this.match(Syntax.LT, Syntax.LTE, Syntax.GT, Syntax.GTE)) {
      const operator = this.previous<undefined>();
      const right = this.parseEquality();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseEquality(): AST.Expression {
    let left = this.parseBitwiseOr();

    while (this.match(Syntax.EqualEqual, Syntax.BangEqual)) {
      const operator = this.previous<undefined>();
      const right = this.parseBitwiseOr();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseBitwiseOr(): AST.Expression {
    let left = this.parseBitwiseAnd();

    while (this.match(Syntax.Pipe)) {
      const operator = this.previous<undefined>();
      const right = this.parseBitwiseAnd();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseBitwiseAnd(): AST.Expression {
    let left = this.parseShift();

    while (this.match(Syntax.Ampersand)) {
      const operator = this.previous<undefined>();
      const right = this.parseShift();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseShift(): AST.Expression {
    let left = this.parseAdditive();

    while (this.match(Syntax.LDoubleArrow, Syntax.RDoubleArrow)) {
      const operator = this.previous<undefined>();
      const right = this.parseAdditive();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseAdditive(): AST.Expression {
    let left = this.parseMultiplicative();

    while (this.match(Syntax.Plus, Syntax.Minus)) {
      const operator = this.previous<undefined>();
      const right = this.parseMultiplicative();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseMultiplicative(): AST.Expression {
    let left = this.parseExponential();

    while (this.match(Syntax.Star, Syntax.Slash, Syntax.SlashSlash, Syntax.Percent)) {
      const operator = this.previous<undefined>();
      const right = this.parseExponential();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseExponential(): AST.Expression {
    let left = this.parseIndex();

    while (this.match(Syntax.Carat, Syntax.StarStar)) { // this is also where i parsed ".." in cosmo, AKA a range literal expression
      const operator = this.previous<undefined>();
      const right = this.parseIndex();
      left = new BinaryExpression(left, right, operator);
    }

    return left;
  }

  private parseIndex(): AST.Expression {
    let object = this.parseCall();

    while (this.check(Syntax.LBracket)) {
      this.consume(Syntax.LBracket);
      if (!this.checkMultiple([Syntax.RBracket, Syntax.RBrace, Syntax.RParen, Syntax.Identifier], -2))
        continue;

      const bracket = this.previous<undefined>();
      const index = this.parseExpression();
      this.consume(Syntax.RBracket, "']'");
      object = new IndexExpression(bracket, <AST.Expression>object, index);
    }

    return object;
  }

  private parseCall(): AST.Expression {
    let callee = this.parseUnary();

    while (this.match(Syntax.LParen)) {
      let args: AST.Expression[] = [];
      if (!this.check(Syntax.RParen))
        args = this.parseExpressionList();

      this.consume(Syntax.RParen, "')'");
      callee = new CallExpression(<AST.Expression>callee, args);
    }

    return callee;
  }

  private parseUnary(): AST.Expression {
    if (this.matchSet(UNARY_SYNTAXES)) {
      const operator = this.previous<undefined>();
      const operand = this.parseUnary();
      if (!this.isAssignmentTarget(operand) && (operator.syntax === Syntax.PlusPlus || operator.syntax === Syntax.MinusMinus))
        throw new ParserSyntaxError("Invalid increment/decrement target", operand.token);

      return new UnaryExpression(operator, operand);
    } else
      return this.parsePrimary();
  }

  /**
   * Parse a primary value, such as a literal or groupings
   */
  private parsePrimary(): AST.Expression {
    if (this.match(Syntax.LParen)) {
      const expr = this.parseExpression();
      this.consume(Syntax.RParen, "')'");
      return new ParenthesizedExpression(expr);
    }

    if (this.matchSet(LITERAL_SYNTAXES)) {
      const token = this.previous();
      if (this.checkMultiple(LITERAL_SYNTAXES, -2)) {
        let message = "Unexpected ";
        switch(token.syntax) {
          case Syntax.Float:
          case Syntax.Int: {
            message += "number";
            break;
          }
          case Syntax.String: {
            message += "string";
            break;
          }
          case Syntax.Boolean: {
            message += "boolean";
            break;
          }
          default: {
            message += "literal";
            break;
          }
        }

        throw new ParserSyntaxError(message, token);
      }

      return token.syntax === Syntax.String && token.lexeme.includes("%{") ?
        this.parseStringInterpolation(<Token<string, Syntax.String>>token)
        : new LiteralExpression(token);
    }

    if (this.match(Syntax.LBrace)) {
      const brace = this.previous<undefined>();
      if (this.match(Syntax.RBrace))
        return new ObjectLiteralExpression(brace, new Map);

      return this.parseObjectContents(brace);
    }

    if (this.match(Syntax.LBracket)) {
      const bracket = this.previous<undefined>();
      const elements = this.parseExpressionList();
      this.consume(Syntax.RBracket, "']'");
      return new ArrayLiteralExpression(bracket, elements);
    }

    if (this.match(Syntax.Identifier))
      return new IdentifierExpression(this.previous());

    throw new ParserSyntaxError(`Expected expression, got '${this.current.syntax === Syntax.EOF ? "EOF" : this.current.lexeme}'`, this.current);
  }

  /**
   * Parse the contents of an object, as well as the final right brace
   * @param brace The left brace token
   */
  private parseObjectContents(brace: Token<undefined, Syntax>): ObjectLiteralExpression {
    const keyValuePairs = [this.parseObjectKeyValuePair()];
    while (this.match(Syntax.Comma))
      keyValuePairs.push(this.parseObjectKeyValuePair());

    this.consume(Syntax.RBrace, "'}'");
    return new ObjectLiteralExpression(brace, new Map(keyValuePairs));
  }

  private parseObjectKeyValuePair(): [AST.Expression, AST.Expression] {
    let key;
    if (this.match(Syntax.Identifier)) {
      const identifier = this.previous<undefined, Syntax.Identifier>();
      key = new LiteralExpression(fakeToken(Syntax.String, `"${identifier.lexeme}"`, identifier.lexeme));
    } else {
      this.consume(Syntax.LBracket, "'['");
      key = this.parseExpression();
      this.consume(Syntax.RBracket, "']'");
    }

    this.consume(Syntax.Colon, "':'");
    const value = this.parseExpression();
    return [key, value];
  }

  private parseStringInterpolation(string: Token<string, Syntax.String>): StringInterpolationExpression {
    const rawParts = this.extractInterpolationParts(string.value);
    const parts: (LiteralExpression<string> | AST.Expression)[] = [];

    for (const part of rawParts) {
      if (part.startsWith("%{")) {
        const interpolationParser = new Parser(part.slice(2, -1));
        const expression = interpolationParser.parseExpression();
        parts.push(expression);
      } else
        parts.push(new LiteralExpression(fakeToken(Syntax.String, `"${part}"`, part)));
    }

    return new StringInterpolationExpression(parts);
  }

  private extractInterpolationParts(string: string): string[] {
    const rawParts: string[] = [];
    const pattern = /%\{([^{}]+)\}/;
    const match = string.match(pattern);

    if (match !== null) {
      rawParts.push(match.input!.slice(0, match.index!));
      rawParts.push(match[0]);

      if (pattern.test(match.input!.slice(match.index! + match[0].length))) {
        rawParts.push(...this.extractInterpolationParts(match.input!.slice(match.index! + match[0].length)));
      } else {
        rawParts.push(match.input!.slice(match.index! + match[0].length));
      }
    }

    return rawParts;
  }

  /**
   * @returns Whether or not `operand` can be a target of an assignment expression
   */
  private isAssignmentTarget(operand: AST.Expression): boolean {
    return operand instanceof IdentifierExpression
      || operand instanceof IndexExpression;
  }

  /**
   * Parses a type reference
   */
  private parseType(): AST.TypeRef {
    return this.parseUnionType();
  }

  private parseUnionType(): AST.TypeRef {
    let left = this.parseArrayType();

    while (this.match(Syntax.Pipe)) {
      const singularTypes: (SingularTypeExpression | ArrayTypeExpression)[] = [];
      if (left instanceof UnionTypeExpression)
        singularTypes.push(...left.types);
      else if (left instanceof SingularTypeExpression || left instanceof ArrayTypeExpression)
        singularTypes.push(left);

      singularTypes.push(this.parseSingularType());
      left = new UnionTypeExpression(singularTypes);
    }

    return left;
  }

  private parseArrayType(): AST.TypeRef {
    let left: AST.TypeRef = this.parseSingularType();

    while (this.match(Syntax.LBracket)) {
      this.consume(Syntax.RBracket, "']'");
      left = new ArrayTypeExpression(left);
    }

    if (this.match(Syntax.Question))
      left = new UnionTypeExpression([
        <SingularTypeExpression>left,
        new SingularTypeExpression(fakeToken(Syntax.Undefined, "undefined"))
      ]);

    return left;
  }

  private parseSingularType(): SingularTypeExpression {
    if (!this.checkType())
      throw new ParserSyntaxError(`Expected type, got '${this.current.lexeme}'`, this.current);

    const typeKeyword = this.advance<undefined, Syntax.Identifier>();
    let typeArgs: AST.TypeRef[] | undefined;
    if (this.match(Syntax.LT)) {
      typeArgs = this.parseTypeList();
      this.consume(Syntax.GT, "'>'");
    }

    return new SingularTypeExpression(typeKeyword, typeArgs);
  }

  private consumeSemicolons(): void {
    while (this.match(Syntax.Semicolon));
  }

  /**
   * Parses a list of type references separated by commas
   *
   * Must have at least one type
   */
  private parseTypeList(): AST.TypeRef[] {
    const types = [ this.parseType() ];
    while (this.match(Syntax.Comma))
      types.push(this.parseType());

    return types;
  }

  /**
   * Parses a list of expressions separated by commas
   */
  private parseExpressionList(): AST.Expression[] {
    if (this.checkMultiple([Syntax.RBracket, Syntax.RParen]))
      return [];

    const expressions = [ this.parseExpression() ];
    while (this.match(Syntax.Comma))
      expressions.push(this.parseExpression());

    return expressions;
  }

  /**
   * Advances to the next token
   * @returns The previous token
   */
  private advance<V extends ValueType = ValueType, S extends Syntax = Syntax>(): Token<V, S> {
    const token = this.current;
    if (!this.isFinished)
      this.position++;

    return <Token<V, S>>token;
  }

  /**
   * @returns The previous token
   */
  private previous<V extends ValueType = ValueType, S extends Syntax = Syntax>(): Token<V, S> {
    return <Token<V, S>>this.peek(-1)!;
  }

  /**
   * Checks for a set of syntax types, and consumes it if one exists
   * @returns True if the current syntax matches any one syntax in `syntaxSet`
   */
  private matchSet(syntaxSet: SyntaxSet): boolean {
    return this.match(...syntaxSet);
  }

  /**
   * Checks for a syntax type, and consumes it if it exists
   * @returns True if the current syntax matches any one syntax in `syntaxes`
   */
  private match(...syntaxes: Syntax[]): boolean {
    for (const syntax of syntaxes)
      if (this.check(syntax)) {
        this.advance();
        return true;
      }

    return false;
  }

  /**
   * @returns Whether or not we're currently at a type reference
   */
  private checkType(offset = 0): boolean {
    return this.checkMultiple([Syntax.Identifier, Syntax.Undefined, Syntax.Null], offset) && this.isTypeDefined(this.peek(offset)!.lexeme);
  }

  /**
   * @returns Whether or not `name` is a type recognized by P
   */
  private isTypeDefined(name: string): boolean {
    for (let i = this.typeScopes.length - 1; i >= 0; i--)
      if (this.typeScopes[i].includes(name))
        return true;

    return false;
  }

  /**
   * @returns True if the syntax at `offset` matches any one syntax in `syntaxes`
   */
  private checkMultiple(syntaxes: Syntax[], offset = 0): boolean {
    for (const syntax of syntaxes)
      if (this.check(syntax, offset))
        return true;

    return false;
  }

  /**
   * @returns True if the syntax at `offset` matches `syntax`
   */
  private check(syntax: Syntax, offset = 0): boolean {
    return this.peek(offset)?.syntax === syntax;
  }

  /**
   * Expects `syntax` to exist, and throws if it does not
   *
   * Advances the parser if it does
   */
  private consume<V extends ValueType = ValueType>(syntax: Syntax, expectedOverride?: string): Token<V> {
    const gotSyntax = this.current ? Syntax[this.current.syntax] : "EOF";
    if (!this.match(syntax))
      throw new ParserSyntaxError(`Expected ${expectedOverride ?? `'${Syntax[syntax]}'`}, got ${gotSyntax}`, this.current);

    return this.previous();
  }

  protected override get isFinished(): boolean {
    return this.check(Syntax.EOF);
  }
}