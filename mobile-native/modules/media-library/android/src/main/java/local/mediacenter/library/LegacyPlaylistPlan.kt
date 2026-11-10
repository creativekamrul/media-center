package local.mediacenter.library

import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction

internal object LegacyPlaylistPlan {
 fun paths(bytes:ByteArray):List<String>{
  require(bytes.size<=2*1024*1024){"Playlist exceeds 2 MiB"}
  val text=Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString().removePrefix("\uFEFF")
  val lines=text.lineSequence().map{it.trimEnd('\r')}.filter{it.isNotBlank()&&!it.startsWith('#')}.toList()
  require(lines.isNotEmpty()&&lines.size<=10000){"Choose a playlist with 1–10,000 cached entries"}
  PortablePlaylist.render(lines);return lines
 }
 fun keys(paths:List<String>,index:Map<String,List<String>>):List<String> = paths.map{path->
  val keys=index[path].orEmpty().distinct();require(keys.size==1){"Every entry must match one cached source in this folder. Re-export ambiguous or missing items instead."};keys.single()
 }
}
