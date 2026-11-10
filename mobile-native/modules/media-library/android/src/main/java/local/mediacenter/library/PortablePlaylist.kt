package local.mediacenter.library
/** Portable paths inside our selected media folders only; never URLs, traversal or provider credentials. */
internal object PortablePlaylist {
 fun render(paths:List<String>):String {
  require(paths.all{path->val root=listOf("../Music/","../Videos/").firstOrNull{path.startsWith(it)};root!=null&&!path.any{it<' '||it=='\\'||it=='\u007f'}&&path.removePrefix(root).split('/').all{it.isNotBlank()&&it!=".."&&it!="."}}){"Invalid portable playlist path"}
  return "#EXTM3U\n"+paths.joinToString("\n")+(if(paths.isNotEmpty())"\n" else "")
 }
}
