const {defineConfig,globalIgnores}=require('eslint/config');
const expo=require('eslint-config-expo/flat');
module.exports=defineConfig([
 globalIgnores(['android/**','ios/**','dist/**','native-runtime/**','modules/**/build/**']),
 expo,
]);
