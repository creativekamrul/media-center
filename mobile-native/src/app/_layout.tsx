import {SharedReceiver} from '../SharedReceiver';
import {Welcome} from '../Welcome';
import * as SplashScreen from 'expo-splash-screen';
import {LaunchScreen} from '../LaunchScreen';
import React,{useEffect,useRef} from 'react';

import {Stack,router,useRootNavigationState} from 'expo-router';

import {SafeAreaProvider} from 'react-native-safe-area-context';

import {useFonts,DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold} from '@expo-google-fonts/dm-sans';

import {Sora_600SemiBold} from '@expo-google-fonts/sora';

import {Linking} from 'react-native';

import {AppState,usePalette,useApp} from '../AppState';

void SplashScreen.preventAutoHideAsync().catch(()=>{});

function Routes(){const c=usePalette();const {prefs}=useApp();const navigation=useRootNavigationState(),handled=useRef(false);useEffect(()=>{if(!navigation?.key||handled.current)return;handled.current=true;void Linking.getInitialURL().then(url=>{const path=url?.match(/^mediacenter:\/\/\/?(search|library|downloads)\/?$/)?.[1];if(path)router.replace(('/'+path) as '/search'|'/library'|'/downloads')}).catch(()=>{})},[navigation?.key]);return <><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:c.bg},animation:prefs.reduceMotion?'none':'slide_from_right'}}><Stack.Screen name="(tabs)" options={{animation:'none'}}/></Stack><SharedReceiver ready={!!navigation?.key}/><Welcome/></>}

export default function Layout(){const [loaded,error]=useFonts({DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold,Sora_600SemiBold});if(!loaded&&!error)return <LaunchScreen/>;return <SafeAreaProvider><AppState><Routes/></AppState></SafeAreaProvider>}

