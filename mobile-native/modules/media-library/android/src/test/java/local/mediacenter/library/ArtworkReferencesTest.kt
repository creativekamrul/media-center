package local.mediacenter.library
import org.junit.Assert.*
import org.junit.Test

class ArtworkReferencesTest {
 @Test fun referencesKeepSourceIdentityAndDeduplicate(){
  val refs=ArtworkReferences.parse("""[{"account":"a","id":"same"},{"account":"b","id":"same"},{"account":"a","id":"same"}]""")
  assertEquals(setOf("a" to "same","b" to "same"),refs)
 }
 @Test fun invalidIdentitiesDoNotBecomeFilesystemPaths(){
  assertTrue(ArtworkReferences.parse("""[{"account":"device","id":"x"},{"account":2,"id":"x"},{"account":"a","id":null},{"account":"a","id":"bad\u0000id"}]""").isEmpty())
  assertNotEquals(CustomizationData.key("a","../x"),CustomizationData.key("b","../x"))
 }
}
