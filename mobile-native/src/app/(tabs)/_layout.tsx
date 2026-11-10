import React from 'react';
import {Tabs} from 'expo-router';
import {usePalette} from '../../AppState';
// Keep library state and scroll offsets when switching the floating navigation.
export default function MainTabs(){const c=usePalette();return <Tabs tabBar={()=>null} backBehavior="initialRoute" screenOptions={{headerShown:false,lazy:true,freezeOnBlur:true,animation:'none',sceneStyle:{backgroundColor:c.bg}}}><Tabs.Screen name="index"/><Tabs.Screen name="explore"/><Tabs.Screen name="library"/><Tabs.Screen name="search"/></Tabs>}
