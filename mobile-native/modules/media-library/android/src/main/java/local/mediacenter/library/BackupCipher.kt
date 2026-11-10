package local.mediacenter.library
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/** Portable encrypted backup, independent of this installation's Android Keystore. */
internal object BackupCipher {
 const val LIMIT=64*1024*1024
 private val magic="MCBACKUP1".toByteArray(Charsets.US_ASCII)
 private const val rounds=600000
 private fun key(password:CharArray,salt:ByteArray):SecretKeySpec {
  require(password.size in 12..1024){"Use a backup password with 12–1,024 characters"}
  val spec=PBEKeySpec(password,salt,rounds,256)
  return try{val bytes=SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded;try{SecretKeySpec(bytes,"AES")}finally{bytes.fill(0)}}finally{spec.clearPassword()}
 }
 fun encrypt(plain:ByteArray,password:CharArray):ByteArray {
  require(plain.size<=LIMIT-128){"Backup exceeds the 64 MiB archive limit"}
  val salt=ByteArray(16);val iv=ByteArray(12);SecureRandom().apply{nextBytes(salt);nextBytes(iv)}
  val header=magic+salt+iv;val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key(password,salt),GCMParameterSpec(128,iv));cipher.updateAAD(header)
  return header+cipher.doFinal(plain)
 }
 fun decrypt(encrypted:ByteArray,password:CharArray):ByteArray {
  require(encrypted.size in magic.size+16+12+16..LIMIT&&encrypted.copyOfRange(0,magic.size).contentEquals(magic)){"Choose a Media Center encrypted backup"}
  val salt=encrypted.copyOfRange(magic.size,magic.size+16);val header=encrypted.copyOfRange(0,magic.size+28);val iv=header.takeLast(12).toByteArray()
  val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(password,salt),GCMParameterSpec(128,iv));cipher.updateAAD(header)
  return try{cipher.doFinal(encrypted,header.size,encrypted.size-header.size)}catch(_:javax.crypto.AEADBadTagException){throw IllegalArgumentException("Password is incorrect or the backup is damaged. Nothing was restored.")}
 }
}
