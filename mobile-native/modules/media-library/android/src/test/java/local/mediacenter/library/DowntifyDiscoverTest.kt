package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
import java.net.ServerSocket
import kotlin.concurrent.thread
class DowntifyDiscoverTest {
 @Test fun searchAndArtistUseFinderContractsAndPreserveKinds(){
  val server=ServerSocket(0)
  val paths=mutableListOf<String>()
  val worker=thread(isDaemon=true){try{repeat(3){server.accept().use{socket->val reader=socket.getInputStream().bufferedReader();val path=reader.readLine().split(" ")[1].substringBefore("?");while(!reader.readLine().isNullOrEmpty()){};paths.add(path);val body=when(path){
   "/api/finder/search"->"""{"songs":[{"name":"Song","artists":["Artist"],"song_id":"abcdefghijk","duration":12}],"artists":[{"artist_id":42,"name":"Artist"}],"albums":[{"album_id":42,"name":"Album"}]}"""
   "/api/finder/artist"->"""{"artist_id":42,"name":"Artist","top_songs":[]}"""
   "/api/finder/artist/albums"->"""[{"album_id":42,"name":"Album","record_type":"single"}]"""
   else->"{}"
  }.toByteArray();socket.getOutputStream().use{it.write(("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: "+body.size+"\r\nConnection: close\r\n\r\n").toByteArray());it.write(body)}}}}catch(_:Exception){}}
  try{val account=JSONObject().put("id","test").put("url","http://127.0.0.1:"+server.localPort)
   val result=Downtify.discover(account,"discover","artist","");assertEquals(1,result.getJSONArray("tracks").length());assertNotEquals(result.getJSONArray("artists").getJSONObject(0).getString("coverArt"),result.getJSONArray("albums").getJSONObject(0).getString("coverArt"))
   val artist=Downtify.discover(account,"artist","","42");assertEquals("single",artist.getJSONArray("albums").getJSONObject(0).getString("releaseType"));assertTrue(paths.contains("/api/finder/artist/albums"))
  }finally{server.close();worker.join(1000)}
 }
 @Test(expected=IllegalArgumentException::class) fun rejectArbitraryDiscoveryRoutes(){Downtify.discover(JSONObject(),"artist","","../../secrets")}
 @Test fun saveDeduplicatesAndSubmitsServerDownloadContract(){
  val server=ServerSocket(0);val requests=mutableListOf<Pair<String,String>>()
  val worker=thread(isDaemon=true){try{repeat(3){server.accept().use{socket->
   val reader=socket.getInputStream().bufferedReader();val path=reader.readLine().split(" ")[1];var length=0
   while(true){val line=reader.readLine();if(line.isNullOrEmpty())break;if(line.startsWith("Content-Length:",true))length=line.substringAfter(":").trim().toInt()}
   val chars=CharArray(length);var read=0;while(read<length){val n=reader.read(chars,read,length-read);if(n<0)break;read+=n};requests.add(path to String(chars))
   val body=when{path.startsWith("/api/finder/search")->"""{"songs":[{"name":"Fresh song","artists":["Artist"],"song_id":"zyxwvutsrqp","duration":120,"album_name":"Album"}]}""";path.startsWith("/api/similar/tracks")->"""[{"name":"Related","artists":["Other"],"song_id":"related1234","duration":90}]""";else->"{}"}.toByteArray()
   socket.getOutputStream().use{it.write(("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: "+body.size+"\r\nConnection: close\r\n\r\n").toByteArray());it.write(body)}
  }}}catch(_:Exception){}}
  try{val a=JSONObject().put("id","save-test").put("url","http://127.0.0.1:"+server.localPort)
   val found=Downtify.discover(a,"discover","Fresh","");val id=found.getJSONArray("tracks").getJSONObject(0).getString("id")
   assertEquals(1,Downtify.save(a,listOf(id,id)))
   assertEquals(1,Downtify.discover(a,"similar","",id).getJSONArray("tracks").length())
   val save=requests.first{it.first=="/api/download/batch"};val body=JSONObject(save.second)
   assertFalse(body.getBoolean("generate_m3u"));assertEquals(1,body.getJSONArray("songs").length());assertEquals("Fresh song",body.getJSONArray("songs").getJSONObject(0).getString("name"))
   assertTrue(requests.last().first.contains("artist=Artist"));assertTrue(requests.last().first.contains("track=Fresh"))
  }finally{server.close();worker.join(1000)}
 }
 @Test fun savedFavoritesReuseLibraryWithoutDiscoveryOrDownloads(){
  Downtify.clearCache();val server=ServerSocket(0);val paths=mutableListOf<String>()
  val worker=thread(isDaemon=true){try{server.accept().use{socket->val reader=socket.getInputStream().bufferedReader();paths.add(reader.readLine().split(" ")[1]);while(!reader.readLine().isNullOrEmpty()){};val body="""[{"file":"Artist/Song.flac","name":"Saved song","artists":["Artist"],"album_name":"Album"}]""".toByteArray();socket.getOutputStream().use{it.write(("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: "+body.size+"\r\nConnection: close\r\n\r\n").toByteArray());it.write(body)}}}catch(_:Exception){}}
  try{val a=JSONObject().put("id","favorites-fixture").put("url","http://127.0.0.1:"+server.localPort)
   val album=Downtify.browse(a,"getAlbumList2",emptyMap()).getJSONObject("albumList2").getJSONArray("album").getJSONObject(0)
   val id=album.getString("coverArt")
   val favorites=Downtify.browse(a,"getFavoriteTracks",mapOf("ids" to org.json.JSONArray(listOf(id,"unknown")).toString())).getJSONObject("starred2").getJSONArray("song")
   assertEquals(1,favorites.length());assertEquals("Saved song",favorites.getJSONObject(0).getString("title"));assertEquals(listOf("/tracks"),paths)
  }finally{server.close();worker.join(1000);Downtify.clearCache()}
 }
}
