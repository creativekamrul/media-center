#include <jni.h>
#include <mpv/client.h>
#include <string>
#include <vector>
#include <locale.h>
#include <unordered_map>
#include <mutex>
#include <algorithm>
#include <cctype>
struct Failure { std::string category; int code=0; int priority=0; };
static std::unordered_map<mpv_handle*,Failure> failures;
static std::mutex failureMutex;
static std::unordered_map<mpv_handle*,int64_t> eventEntries;
// Raw engine logs can contain authenticated URLs. Retain only predefined categories.
static void classify(mpv_handle* h,const char* raw){
 std::string text(raw?raw:""); if(text.size()>16384)text.resize(16384);
 std::transform(text.begin(),text.end(),text.begin(),[](unsigned char c){return std::tolower(c);});
 const char* category=nullptr;int priority=0;
 auto has=[&](const char* v){return text.find(v)!=std::string::npos;};
 if(has("401 unauthorized")||has("403 forbidden")||has("http error 401")||has("http error 403")){category="authorization";priority=5;}
 else if(has("404 not found")||has("http error 404")){category="missing";priority=5;}
 else if(has("certificate verify failed")||has("certificate verification failed")||has("certificate has expired")||has("tls handshake")||has("ssl handshake")||has("tls error")){category="tls";priority=5;}
 else if(has("timed out")||has("timeout")){category="timeout";priority=4;}
 else if(has("failed to resolve")||has("name or service not known")||has("connection refused")){category="network";priority=4;}
 else if(has("moov atom not found")||has("failed to recognize file format")||has("invalid data found")){category="format";priority=3;}
 else if(has("decoder not found")||has("no decoder")||has("failed to initialize a decoder")){category="decoder";priority=3;}
 else if(has("error opening/initializing the selected audio_out")||has("error initializing audio driver")){category="output";priority=3;}
 if(category){std::lock_guard<std::mutex> lock(failureMutex);auto& f=failures[h];if(priority>=f.priority){f.category=category;f.priority=priority;}}
}

static std::unordered_map<mpv_handle*,jobject> surfaces;
static std::mutex surfaceMutex;
extern "C" int av_jni_set_java_vm(void*,void*);
extern "C" int av_jni_set_android_app_ctx(void*,void*);
static jobject context=nullptr;
extern "C" JNIEXPORT jlong JNICALL Java_local_mediacenter_library_NativeMpv_create(JNIEnv* e,jobject,jobject app){
 setlocale(LC_NUMERIC,"C");JavaVM* vm=nullptr;e->GetJavaVM(&vm);av_jni_set_java_vm(vm,nullptr);
 if(!context)context=e->NewGlobalRef(app);av_jni_set_android_app_ctx(context,nullptr);
 auto* h=mpv_create();if(!h)return 0;
 mpv_set_option_string(h,"config","no");mpv_set_option_string(h,"terminal","no");mpv_set_option_string(h,"msg-level","all=warn");
 mpv_set_option_string(h,"idle","yes");mpv_set_option_string(h,"vo","null");mpv_set_option_string(h,"vid","no");
 mpv_set_option_string(h,"ao","audiotrack");mpv_set_option_string(h,"audio-fallback-to-null","no");
 mpv_set_option_string(h,"demuxer-max-bytes","8MiB");mpv_set_option_string(h,"demuxer-max-back-bytes","2MiB");mpv_set_option_string(h,"volume","100");mpv_set_option_string(h,"cache","yes");mpv_set_option_string(h,"network-timeout","20");
 if(mpv_initialize(h)<0){mpv_terminate_destroy(h);return 0;}mpv_request_log_messages(h,"warn");return reinterpret_cast<jlong>(h);
}
extern "C" JNIEXPORT jint JNICALL Java_local_mediacenter_library_NativeMpv_command(JNIEnv* e,jobject,jlong ptr,jobjectArray args){
 auto* h=reinterpret_cast<mpv_handle*>(ptr);if(!h)return -1;
 std::vector<std::string> strings;jsize n=e->GetArrayLength(args);for(int i=0;i<n;i++){auto s=(jstring)e->GetObjectArrayElement(args,i);const char* c=e->GetStringUTFChars(s,nullptr);strings.emplace_back(c);e->ReleaseStringUTFChars(s,c);e->DeleteLocalRef(s);}
 std::vector<const char*> command;for(auto& s:strings)command.push_back(s.c_str());command.push_back(nullptr);return mpv_command(h,command.data());
}
extern "C" JNIEXPORT jstring JNICALL Java_local_mediacenter_library_NativeMpv_property(JNIEnv* e,jobject,jlong ptr,jstring name){
 auto* h=reinterpret_cast<mpv_handle*>(ptr);if(!h)return nullptr;const char* key=e->GetStringUTFChars(name,nullptr);char* result=mpv_get_property_string(h,key);e->ReleaseStringUTFChars(name,key);if(!result)return nullptr;auto value=e->NewStringUTF(result);mpv_free(result);return value;
}
extern "C" JNIEXPORT jint JNICALL Java_local_mediacenter_library_NativeMpv_event(JNIEnv*,jobject,jlong ptr){
 auto* h=reinterpret_cast<mpv_handle*>(ptr);if(!h)return 0;auto* event=mpv_wait_event(h,0);
 if(event->event_id==MPV_EVENT_START_FILE){std::lock_guard<std::mutex> lock(failureMutex);failures[h]=Failure{};eventEntries[h]=((mpv_event_start_file*)event->data)->playlist_entry_id;}
 if(event->event_id==MPV_EVENT_LOG_MESSAGE){auto* log=(mpv_event_log_message*)event->data;classify(h,log->text);}
 if(event->event_id==MPV_EVENT_END_FILE){auto* end=(mpv_event_end_file*)event->data;if(end->reason==MPV_END_FILE_REASON_ERROR){{std::lock_guard<std::mutex> lock(failureMutex);failures[h].code=end->error;}return -1;}if(end->reason==MPV_END_FILE_REASON_EOF)return -2;}
 return event->event_id;
}
extern "C" JNIEXPORT jlong JNICALL Java_local_mediacenter_library_NativeMpv_createVideo(JNIEnv* e,jobject,jobject app,jobject surface){
 setlocale(LC_NUMERIC,"C");JavaVM* vm=nullptr;e->GetJavaVM(&vm);av_jni_set_java_vm(vm,nullptr);
 if(!context)context=e->NewGlobalRef(app);av_jni_set_android_app_ctx(context,nullptr);
 auto* h=mpv_create();if(!h)return 0;auto ref=e->NewGlobalRef(surface);int64_t wid=reinterpret_cast<int64_t>(ref);
 mpv_set_option_string(h,"config","no");mpv_set_option_string(h,"terminal","no");mpv_set_option_string(h,"msg-level","all=warn");
 mpv_set_option_string(h,"vo","gpu");mpv_set_option_string(h,"gpu-context","android");mpv_set_option_string(h,"hwdec","mediacodec-copy");
 mpv_set_option(h,"wid",MPV_FORMAT_INT64,&wid);mpv_set_option_string(h,"ao","audiotrack");mpv_set_option_string(h,"audio-fallback-to-null","no");
 mpv_set_option_string(h,"idle","yes");mpv_set_option_string(h,"keep-open","yes");mpv_set_option_string(h,"cache","yes");mpv_set_option_string(h,"network-timeout","20");
 if(mpv_initialize(h)<0){mpv_terminate_destroy(h);e->DeleteGlobalRef(ref);return 0;}
 {std::lock_guard<std::mutex> lock(surfaceMutex);surfaces[h]=ref;}mpv_request_log_messages(h,"warn");return reinterpret_cast<jlong>(h);
}
extern "C" JNIEXPORT void JNICALL Java_local_mediacenter_library_NativeMpv_destroy(JNIEnv* e,jobject,jlong ptr){if(ptr){auto* h=reinterpret_cast<mpv_handle*>(ptr);mpv_terminate_destroy(h);{std::lock_guard<std::mutex> failureLock(failureMutex);failures.erase(h);eventEntries.erase(h);}std::lock_guard<std::mutex> lock(surfaceMutex);auto it=surfaces.find(h);if(it!=surfaces.end()){e->DeleteGlobalRef(it->second);surfaces.erase(it);}}}

extern "C" JNIEXPORT jstring JNICALL Java_local_mediacenter_library_NativeMpv_lastError(JNIEnv* e,jobject,jlong ptr){
 std::lock_guard<std::mutex> lock(failureMutex);auto it=failures.find(reinterpret_cast<mpv_handle*>(ptr));
 std::string safe=it==failures.end()?"unknown|0":it->second.category+"|"+std::to_string(it->second.code);
 return e->NewStringUTF(safe.c_str());
}

// Structured options avoid delimiter injection and keep per-file credentials out of global state.
extern "C" JNIEXPORT jint JNICALL Java_local_mediacenter_library_NativeMpv_load(JNIEnv* e,jobject,jlong ptr,jstring url,jboolean append,jstring headers){
 auto* h=reinterpret_cast<mpv_handle*>(ptr);if(!h)return -1;
 const char* u=e->GetStringUTFChars(url,nullptr);const char* hs=e->GetStringUTFChars(headers,nullptr);
 mpv_node optionsValue{};optionsValue.format=MPV_FORMAT_STRING;optionsValue.u.string=const_cast<char*>(hs);
 char* key=const_cast<char*>("http-header-fields");mpv_node_list optionsList{1,&optionsValue,&key};
 mpv_node args[5]{};const char* values[]={"loadfile",u,append?"append":"replace"};
 for(int i=0;i<3;i++){args[i].format=MPV_FORMAT_STRING;args[i].u.string=const_cast<char*>(values[i]);}
 args[3].format=MPV_FORMAT_INT64;args[3].u.int64=-1;args[4].format=MPV_FORMAT_NODE_MAP;args[4].u.list=&optionsList;
 mpv_node_list list{5,args,nullptr};mpv_node node{};node.format=MPV_FORMAT_NODE_ARRAY;node.u.list=&list;mpv_node result{};
 int code=mpv_command_node(h,&node,&result);mpv_free_node_contents(&result);e->ReleaseStringUTFChars(url,u);e->ReleaseStringUTFChars(headers,hs);return code;
}
extern "C" JNIEXPORT jlong JNICALL Java_local_mediacenter_library_NativeMpv_eventEntry(JNIEnv*,jobject,jlong ptr){std::lock_guard<std::mutex> lock(failureMutex);auto it=eventEntries.find(reinterpret_cast<mpv_handle*>(ptr));return it==eventEntries.end()?-1:it->second;}
