package local.mediacenter.library

import org.junit.Assert.*
import org.junit.Test

class TransferTempNameTest {
 private val token="a29a3fb2-92f6-4199-82a0-0f72e248059f"
 @Test fun temporaryNameKeepsTheRequestedMediaExtension(){
  for(suffix in listOf("flac","mp3","wav","m4a","mp4"))assertTrue(TransferTempName.current(token,suffix).endsWith(".partial.$suffix"))
 }
 @Test fun legacyRecoveryIncludesOnlyTheExactJournaledTokenAndSuffix(){
  assertEquals(listOf(".mc-$token.partial",".mc-$token.partial.flac"),TransferTempName.recovery(token,".mc-$token.partial","Song - $token.flac"))
 }
 @Test fun currentRecoveryDoesNotAdoptOtherFileNames(){
  val name=TransferTempName.current(token,"flac")
  assertEquals(listOf(name),TransferTempName.recovery(token,name,"Song - $token.flac"))
 }
 @Test(expected=IllegalArgumentException::class) fun rejectsUnownedTemporaryName(){TransferTempName.recovery(token,"other.partial.flac","Song - $token.flac")}
 @Test(expected=IllegalArgumentException::class) fun rejectsSuffixTraversal(){TransferTempName.current(token,"../mp3")}
}
