import {requireNativeViewManager} from 'expo-modules-core';
import type {ViewProps} from 'react-native';
export const LiquidGlass=requireNativeViewManager<ViewProps&{targetTag:number;tone:string;light:number;opacity?:number;refraction?:number}>('MediaLibrary');
