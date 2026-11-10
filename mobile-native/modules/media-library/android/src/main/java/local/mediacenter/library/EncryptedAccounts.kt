package local.mediacenter.library
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject
/** Shared native credential access, preserving the existing Keystore alias and AAD. */
internal object EncryptedAccounts {
 private const val keyAlias="media_center_library_v1"
 @Synchronized private fun key():SecretKey {
  val store=KeyStore.getInstance("AndroidKeyStore");store.load(null)
  (store.getKey(keyAlias,null) as? SecretKey)?.let{return it}
  val generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore")
  generator.init(KeyGenParameterSpec.Builder(keyAlias,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
  return generator.generateKey()
 }
 fun write(c:Context,id:String,a:JSONObject) {
  val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());cipher.updateAAD(id.toByteArray())
  val encrypted=cipher.doFinal(a.toString().toByteArray(Charsets.UTF_8))
  val value=Base64.encodeToString(cipher.iv,Base64.NO_WRAP)+":"+Base64.encodeToString(encrypted,Base64.NO_WRAP)
  require(c.getSharedPreferences("media_library",Context.MODE_PRIVATE).edit().putString("account.$id",value).commit()) { "Could not save account" }
 }
 fun read(c:Context,id:String):JSONObject {
  val value=c.getSharedPreferences("media_library",Context.MODE_PRIVATE).getString("account.$id",null)?:throw IllegalArgumentException("Connection no longer exists")
  return try { val parts=value.split(':');val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));cipher.updateAAD(id.toByteArray());JSONObject(String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),Charsets.UTF_8)) }
  catch(e:Exception){throw IllegalStateException("Saved connection cannot be unlocked. Remove it and add it again.")}
 }
}
