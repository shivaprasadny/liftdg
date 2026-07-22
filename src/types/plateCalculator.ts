export type PlateUnit='lb'|'kg';export type PlateCalculationMode='exact'|'below'|'above'|'closest';
export interface BarProfile{id:string;name:string;barType:string;weight:number;unit:PlateUnit;defaultCollarWeight:number;variableWeight:boolean;fixedWeight:boolean;isBuiltin:boolean;isFavorite:boolean;isArchived:boolean;notes:string|null;}
export interface PlateInventoryItem{id:string;plateWeight:number;unit:PlateUnit;quantity:number;enabled:boolean;displayOrder:number;custom:boolean;}
export interface PlateInventoryProfile{id:string;name:string;unit:PlateUnit;defaultBarId:string|null;defaultCollarWeight:number;items:PlateInventoryItem[];}
export interface PlateLoadInput{targetWeight:number;barWeight:number;collarWeight:number;plates:Pick<PlateInventoryItem,'plateWeight'|'quantity'|'enabled'>[];mode:PlateCalculationMode;fixedWeight?:boolean;}
export interface PlateLoadResult{targetWeight:number;loadedWeight:number;difference:number;exact:boolean;platesPerSide:number[];plateCount:number;mode:PlateCalculationMode;}
export type WarmupStrategy='simple'|'standard'|'powerlifting';export interface WarmupSetResult{percentage:number;reps:number;load:PlateLoadResult;}
