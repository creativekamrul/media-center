const {withAppBuildGradle}=require('expo/config-plugins');
module.exports=config=>withAppBuildGradle(config,mod=>{
 const marker='// Media Center optional production signing';
 mod.modResults.contents=mod.modResults.contents.replace(/\/\/ Media Center optional production signing[\s\S]*?\/\/ End Media Center signing\n?/g,'');
 mod.modResults.contents+=`\n${marker}
if (System.getenv('MEDIA_CENTER_SIGNING_REQUIRED') == '1') {
    def names = ['MEDIA_CENTER_KEYSTORE','MEDIA_CENTER_STORE_PASSWORD','MEDIA_CENTER_KEY_ALIAS','MEDIA_CENTER_KEY_PASSWORD']
    names.each { name -> if (!System.getenv(name)) throw new GradleException('Missing required production signing configuration: ' + name) }
    android.signingConfigs.create('mediaCenterProduction') {
        storeFile file(System.getenv('MEDIA_CENTER_KEYSTORE'))
        storePassword System.getenv('MEDIA_CENTER_STORE_PASSWORD')
        keyAlias System.getenv('MEDIA_CENTER_KEY_ALIAS')
        keyPassword System.getenv('MEDIA_CENTER_KEY_PASSWORD')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.mediaCenterProduction
}
// End Media Center signing
`;
 return mod;
});
