const {withProjectBuildGradle}=require('expo/config-plugins');
module.exports=config=>withProjectBuildGradle(config,config=>{
 const marker='// Media Center: bound CMake object paths for all native modules.';
 // Replace our previous generated block when regenerating an existing project.
 config.modResults.contents=config.modResults.contents.replace(/\/\/ Media Center: bound CMake object paths for all native modules\.[\s\S]*?\/\/ End Media Center native paths\.\n?/g,'');
 const block=`${marker}
subprojects { project ->
    ['com.android.library', 'com.android.application'].each { plugin ->
        project.plugins.withId(plugin) {
            project.android.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_OBJECT_PATH_MAX=240')
            project.android.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_JOB_POOLS=mc_compile=2;mc_link=1')
            project.android.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_JOB_POOL_COMPILE=mc_compile')
            project.android.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_JOB_POOL_LINK=mc_link')
            def ninja = System.getenv('MEDIA_CENTER_NINJA')
            if (ninja) project.android.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_MAKE_PROGRAM=' + ninja)
        }
    }
}
// End Media Center native paths.
`;
 config.modResults.contents=config.modResults.contents.replace(/apply plugin: "expo-root-project"/,block+'\napply plugin: "expo-root-project"');
 return config;
});

