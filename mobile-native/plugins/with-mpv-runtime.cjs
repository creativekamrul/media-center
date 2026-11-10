const {withAppBuildGradle}=require('expo/config-plugins');
// MPV and React Native must load one shared C++ runtime. Pin the runtime from
// the checksum-verified MPV distribution rather than relying on merge order.
module.exports=config=>withAppBuildGradle(config,mod=>{
 const marker='// Media Center MPV runtime';
 mod.modResults.contents=mod.modResults.contents.replace(/\/\/ Media Center MPV runtime[\s\S]*?\/\/ End Media Center MPV runtime\n?/g,'');
 mod.modResults.contents+=`\n${marker}
def mediaRuntime = file('../../native-runtime/arm64-v8a/libc++_shared.so')
tasks.configureEach { task ->
    if (task.name.matches('merge.*NativeLibs')) {
        task.inputs.file(mediaRuntime)
        task.doLast {
            if (!mediaRuntime.exists()) throw new GradleException('Run prepare-mpv.ps1 before building.')
            def targets = task.outputs.files.asFileTree.matching { include '**/arm64-v8a/libc++_shared.so' }.files
            if (targets.size() != 1) throw new GradleException('Expected exactly one ARM64 C++ runtime.')
            targets.each { target -> java.nio.file.Files.copy(mediaRuntime.toPath(), target.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING) }
        }
    }
}
// End Media Center MPV runtime
`;
 return mod;
});
