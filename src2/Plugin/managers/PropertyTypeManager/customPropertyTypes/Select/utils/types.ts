import { PropertySettings } from "../../../schema";
import typeKey from "../type";

export type Settings = PropertySettings["types"][typeof typeKey];
export type Option = Settings["manualOptions"][number];
