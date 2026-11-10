package local.mediacenter.library

/** A podcast show is never a playable target. */
sealed class SpokenTarget {
 abstract val itemId:String
 data class Book(override val itemId:String):SpokenTarget()
 data class Episode(override val itemId:String,val episodeId:String):SpokenTarget()
 fun key(account:String)=when(this){is Book->"$account:book:${itemId.length}:$itemId";is Episode->"$account:podcast:${itemId.length}:$itemId:${episodeId.length}:$episodeId"}
 fun playPath()=when(this){is Book->"api/items/${ProviderHttp.segment(itemId)}/play";is Episode->"api/items/${ProviderHttp.segment(itemId)}/play/${ProviderHttp.segment(episodeId)}"}
}
