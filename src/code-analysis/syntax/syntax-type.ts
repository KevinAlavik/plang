enum Syntax {
  Int,
  Float,
  String,
  Boolean,

  Identifier,
  Function,

  AnyType,
  IntType,
  FloatType,
  StringType,
  BoolType,
  VoidType,
  Null, Undefined,

  Semicolon,
  LParen, RParen,
  LBracket, RBracket,
  LBrace, RBrace,
  Dot, Colon,
  LT, GT, LTE, GTE,// <, >, <=, >=
  LDoubleArrow, RDoubleArrow,
  Tilde,
  Question, QuestionQuestion, QuestionQuestionEqual,
  Plus, Minus,
  Star, Slash, SlashSlash,
  Carat, Percent,
  PlusEqual, MinusEqual,
  StarEqual, SlashEqual, SlashSlashEqual,
  CaratEqual, PercentEqual,
  PlusPlus, MinusMinus,
  Bang,
  AmpersandAmpersand, AmpersandAmpersandEqual,
  Ampersand, AmpersandEqual,
  PipePipe, PipePipeEqual,
  Pipe, PipeEqual,
  Hashtag,
  Equal, EqualEqual, BangEqual, ColonEqual,

  EOF
}

export default Syntax;