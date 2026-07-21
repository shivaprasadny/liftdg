import { Switch } from 'react-native'; import { colors } from '@/constants/colors'; import { SettingsRow } from './SettingsRow';
export function SettingsToggle({label,value,onChange}: {label:string;value:boolean;onChange:(value:boolean)=>void}){return <SettingsRow label={label} control={<Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{true:colors.accent,false:colors.border}}/>}/>;}

