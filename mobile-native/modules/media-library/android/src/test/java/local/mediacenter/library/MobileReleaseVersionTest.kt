package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class MobileReleaseVersionTest {
 @Test fun stableAndNumericPrereleaseOrder(){val versions=listOf("1.0.0-alpha","1.0.0-alpha.2","1.0.0-alpha.10","1.0.0-beta","1.0.0-rc.2","1.0.0","1.0.1","1.1.0","2.0.0").map{MobileReleaseVersion.parse(it)!!};for(i in 1 until versions.size)assertTrue(versions[i]>versions[i-1]);assertEquals(0,MobileReleaseVersion.parse("1.0.0+build.1")!!.compareTo(MobileReleaseVersion.parse("1.0.0+other")!!))}
 @Test fun rejectsBadVersionsAndDevelopmentArtifacts(){for(v in listOf("1.0","01.0.0","1.0.0-01","1.0.0-rc..2"))assertNull(MobileReleaseVersion.parse(v));for(name in listOf("Media-Center-Mobile-1.0.0-preview-arm64.apk","Media-Center-Mobile-1.0.0-preview-emulator-arm64.apk","other-1.0.0-arm64.apk"))assertNull(MobileReleaseVersion.fromAsset(name));assertNotNull(MobileReleaseVersion.fromAsset("Media-Center-Mobile-1.0.0-arm64.apk"))}
}
