import type { ValueType } from "../../../../code-analysis/type-checker";
import type { Type } from "../../../../code-analysis/type-checker/types/type";
import Intrinsic from "../../../values/intrinsic";
import IOLib from "./io";

export default class StdLib extends Intrinsic.Lib {
  public readonly name = "std";

  public get propertyTypes(): Record<string, Type> {
    return {};
  }

  public get members(): Record<string, ValueType> {
    return {
      io: new IOLib(this.intrinsics, this.name)
    };
  }
}