# Compile WebRTC

Current WebRTC checkout commit is 62cbb23aeecd48480a7c0aaceb0078453b84ea95

`git checkout 62cbb23aeecd48480a7c0aaceb0078453b84ea95`
`gclient sync`

### Steps

* Add rtc_use_h264=true to args file

    `gn args out/Default`

    The content of the screen should like this

    ```
    # Build arguments go here.
    # See "gn args <out_dir> --list" for available build arguments.
    rtc_use_h264=true
    is_debuggable=false
    ```

* Change ffmpeg settings

  *  Go to "third_party/ffmpeg/chromium/scripts/"
  *  Edit the file build_ffmpeg.py and add mp4 as muxer and h264 as decoder,
      * Find line first line below
        '--enable-parser=opus,vorbis,flac',
      * Add the below lines after the line above  
        '--enable-muxer=mp4',
        '--enable-decoder=h264',

  * Edit the file  ./chromium/scripts/generate_gn.py and comment out the below line with dash #
    ```
    #    'libavformat/sdp.o',
    ```    
    and make CheckLicensesForSources function return always true
    by commenting out the 
    
    #return False
    
    
  * Build ffmpeg with for linux, mac, win and arch is x64 for each platform
  ```
  ./chromium/scripts/build_ffmpeg.py linux x64
  ./chromium/scripts/copy_config.sh
  ./chromium/scripts/generate_gn.py```


##### This is a documentation file for FFmpeg in chromium
  https://docs.google.com/document/d/14bqZ9NISsyEO3948wehhJ7wc9deTIz-yHUhF1MQp7Po/edit

  * Edit webrtc/media/engine/webrtcvideoengine2.cc and comment out the line below
  in GetSupportedCodecs function
  ```
  //  AppendVideoCodecs(internal_codecs, &unified_codecs);
    ```

  * Comment out the line in h264_decoder_impl.cc //RTC_DCHECK_EQ(context->pix_fmt, kPixelFormat);
  Safari sends pixel format in yuvj420p which is compatible with yuv420p but it is not preferred. The comment out above
  make safari send live streams
  
  	
  * Compile the project with

  `ninja -C out/Default`
  
### Notes

Max default bitrate settings are in 
webrtc/media/engine/webrtcvideoengine2.ccwebrtc/media/engine/webrtcvideoengine2.cc
<pre>
static int GetMaxDefaultVideoBitrateKbps(int width, int height) {
  if (width * height <= 320 * 240) {
    return 600;
  } else if (width * height <= 640 * 480) {
    return 1700;
  } else if (width * height <= 960 * 540) {
    return 2000;
  } else {
    return 2500;
  }
}
</pre>

  
