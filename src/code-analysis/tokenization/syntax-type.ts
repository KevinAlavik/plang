enum Syntax {
  Int,
  Float,
  String,
  Boolean,
  Null, Undefined,

  Mut,
  Identifier,
  Println,
  If, Unless, Else,
  While, Until, Every,
  Function,
  Return,
  Break, Next, Throw,
  Interface, Class, New, Super, Mixin,
  Private, Protected, Static,
  TypeOf,
  Is, In,
  Use, From, Package,

  Semicolon, Comma,
  At,
  DotDot,
  LParen, RParen,
  LBracket, RBracket,
  LBrace, RBrace,
  Dot, ColonColon, Colon,
  LT, GT, LTE, GTE,// <, >, <=, >=
  LDoubleArrow, RDoubleArrow,
  Tilde,
  Question, QuestionQuestion, QuestionQuestionEqual,
  Plus, Minus,
  Star, Slash, SlashSlash,
  Carat, StarStar, Percent,
  PlusEqual, MinusEqual,
  StarEqual, SlashEqual, SlashSlashEqual,
  CaratEqual, StarStarEqual, PercentEqual,
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