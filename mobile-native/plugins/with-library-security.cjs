const {withAndroidManifest,withGradleProperties}=require('expo/config-plugins');
module.exports=config=>{
 config=withGradleProperties(config,mod=>{
  mod.modResults=mod.modResults.filter(p=>p.key!=='android.minSdkVersion');
  mod.modResults.push({type:'property',key:'android.minSdkVersion',value:'26'});
  return mod;
 });
 return withAndroidManifest(config,mod=>{
  const app=mod.modResults.manifest.application[0];
  app.$['android:usesCleartextTraffic']='true';
  app.$['android:allowBackup']='false';
  const activity=app.activity.find(a=>a.$['android:name']==='.MainActivity');
  if(activity){activity['intent-filter']??=[];if(!activity['intent-filter'].some(f=>f.action?.some(a=>a.$['android:name']==='android.intent.action.SEND')))activity['intent-filter'].push({action:[{$:{'android:name':'android.intent.action.SEND'}}],category:[{$:{'android:name':'android.intent.category.DEFAULT'}}],data:[{$:{'android:mimeType':'text/plain'}}]});}
  return mod;
 });
};
