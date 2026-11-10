import React from 'react';
import {View,Text,Image,ActivityIndicator} from 'react-native';
export function LaunchScreen(){return <View style={{flex:1,backgroundColor:'#101513',alignItems:'center',justifyContent:'center',gap:18}}><Image source={require('../assets/splash-icon.png')} style={{width:112,height:112}}/><Text style={{fontSize:23,fontWeight:'600',color:'#eff3ef'}}>Media Center</Text><ActivityIndicator color="#80e5ac"/><Text style={{fontSize:13,color:'#a5afa9'}}>Preparing your libraries</Text></View>}
