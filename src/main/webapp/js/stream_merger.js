

export class StreamMerger{
  constructor(width, height, autoMode){
      this.streams = [];
      this.width = width;
      this.height = height;
      const AudioContext = window.AudioContext || window.webkitAudioContext
      this.audioCtx = new AudioContext();
      this.audioDestination = this.audioCtx.createMediaStreamDestination()
      this.autoMode = autoMode;

      //4:3 portrait mode stream width height
      this.pwidth = 0
      this.pheight = 0

      //4:3 vertical mode stream width height
      this.vwidth = 0
      this.wheight = 0;

      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('width', this.width);
      this.canvas.setAttribute('height', this.height);
      this.ctx = this.canvas.getContext('2d');

      this.streamCount = 0;
      this.frameCount = 0;

      // delay node for video sync
      this.videoSyncDelayNode = this.audioCtx.createDelay(5.0)
      this.videoSyncDelayNode.connect(this.audioDestination)

      this.started = false;
      this.fps = 30;
  }
  getResult(){
      return this.result;
  }

  /*
  * Options
  * streamId = Id of the stream
  * width = width of the stream that is being merged
  * height = height of the stream that is being merged
  * X = Starting location pixel on canvas horizontal
  * Y = Starting location pixel on canvas vertical 
  * Xindex = placement index of videos, index 0 means width * 0, index 1 means width * 1 as starting points
  * Yindex = placement index of videos, index 0 means height * 0, index 1 means height* 1 as starting points
  * mute = mute stream or not
  * 
  */
  addStream(mediaStream, options) {
      this.streamCount ++;
      const stream = {}
      this.audioCtx.resume();
      stream.streamId = options.streamId;

      stream.width = options.width || 150;
      stream.height = options.height || 150;
      stream.Xindex = options.Xindex || 0;
      stream.Yindex = options.Yindex || 0;
      stream.portrait = false;
      stream.aspectRatio = 4/3;

      options.x == undefined ? stream.x = (stream.width * stream.Xindex): stream.x = options.x;
      options.x == undefined ? stream.y = (stream.height * stream.Yindex): stream.y = options.y;

      console.debug(stream.width, stream.Xindex , stream.x)
      stream.mute = options.mute || false;

      let videoElement = null
      
      videoElement = document.createElement('video');
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.srcObject = mediaStream;
      videoElement.setAttribute('style', 'position:fixed; left: 0px; top:0px; display: none pointer-events: none; opacity:0;');
      document.body.appendChild(videoElement);

      if (!stream.mute) {
        stream.audioSource = this.audioCtx.createMediaStreamSource(mediaStream)
        stream.audioGainNode = this.audioCtx.createGain() // Intermediate gain node
        stream.audioGainNode.gain.value = 1
        stream.audioSource.connect(stream.audioGainNode).connect(this.audioDestination) // Default is direct connect
      }
      stream.element = videoElement
      this.streams.push(stream);

      if(this.autoMode == true){
        this.resizeAndSortV2();
        /*
        * To understand the incoming resolution we need to wait until the stream is rendered
        * If the incoming stream is coming from mobile portrait mode default getUserMedia ratio is 3:4
        */
        videoElement.onloadedmetadata = () => {
          console.debug("streamId = " + stream.streamId);
          var pheight = mediaStream.getVideoTracks()[0].getSettings().height;
          var pwidth = mediaStream.getVideoTracks()[0].getSettings().width;
          if(pheight > pwidth){
            console.debug("portrait mode");
            let xoffset = ( stream.width - this.pwidth ) / 2;
            stream.portrait = true;
            stream.x += xoffset;
            stream.width = this.pwidth;
            stream.height = this.pheight;
            console.log("Location offset from metadata x = " + stream.x + " y = " + stream.y);
          }
        }
      }
    }

    requestAnimationFrameV2(callback) {
      let fired = false
      const interval = setInterval(() => {
        if (!fired && document.hidden) {
          fired = true
          clearInterval(interval)
          callback()
        }
      }, 1000 / this.fps)
      requestAnimationFrame(() => {
        if (!fired) {
          fired = true
          clearInterval(interval)
          callback()
        }
      })
    }

    /*
    * For automatic sorting, since webcams use default ratio as 4:3 the default canvas ratio is also 4:3
    * This is because the canvas size is also dynamic
    * If you want to change the ratios you can change the hardcoded this.height, this.width
    */
    resizeAndSortV2(){
      //Clears all of the canvas when sorted.
      this.ctx.clearRect(0, 0, this.width, this.height);

      let xindex = 0;
      let yindex = 0;

      let yNumber = 0

      let cropWidth = 0;
      let cropHeight = 0;
      let topWidth = 0;

      let remainingStreams = this.streams.length;

      let widthOffset = 0;
      let heightOffset = 0;

      let divider = 0;

      var pcheight = 0;
      var pcwidth = 0;

      //Default video size is 320x240, it protects aspect ratio, might be changed while adding streams.
      for(let i = 1; i <= 5; i++){
        if(this.streams.length <= i*i){
          divider = i;
          if( i*(i-1) >= this.streams.length && this.streams.length > 2){
            yNumber = i - 1;
            this.height = 240 * yNumber;
            this.width = 320 * yNumber;

            pcheight = 240 * yNumber;
            pcwidth = 180* yNumber;
          
          }
          else{
            yNumber = i;
            this.height = 240 * yNumber;
            this.width = 320 * yNumber;
            pcheight = 240 * yNumber;
            pcwidth = 180* yNumber;
          }
          break;
        }
      }
      this.canvas.setAttribute('width', this.width);
      this.canvas.setAttribute('height', this.height);

      console.log("Row number = " + yNumber)
      console.log("canvas width = " + this.width + "canvas height = " + this.height);

      var extraStreams = this.streams.length - (yNumber * yNumber);
      let tmp = 0;
      for( let i = 1; i <= this.streams.length; i++ ){

        console.log("extraStreams = " + extraStreams + " stream length = " + this.streams.length)
        console.log("Xindex = " + xindex + "Yindex = " + yindex);

        const stream = this.streams[i-1];
        if(extraStreams <= 0 || this.streams.length <= 3){
          this.pwidth = (pcwidth) / (divider);
          this.pheight = (pcheight) / (divider);

          this.vwidth = (this.width) / (divider);
          this.vheight = (this.height) / (divider);

          if(stream.portrait == true){
            stream.width = this.pwidth;
            stream.height = this.pheight; 
            
            stream.x = this.vwidth * xindex;
            stream.y = (this.vheight * yindex) - heightOffset;

            let xoffset = ( this.vwidth - this.pwidth ) / 2;
            stream.x += xoffset;
          }
          else{
            stream.width = this.vwidth;
            stream.height = this.vheight;
            stream.x = this.vwidth * xindex;
            stream.y = (this.vheight * yindex) - heightOffset;
          }
          tmp += (this.width) / (divider)
          console.log("Video width = " + stream.width + "Video height = " + stream.height);

          if(xindex == 0){
            cropHeight = cropHeight + stream.height;
            console.debug("CropHeight = " + cropHeight);
          }

          xindex ++;
          if(yindex >= (yNumber)-1 && this.streams.length != 1){
            console.log("TopWidth = " + topWidth + " remainingStreams = " + remainingStreams);
            widthOffset = (topWidth - (this.vwidth * remainingStreams )) / 2;
            stream.x += widthOffset;
          }  

          if( xindex >= yNumber){
            xindex = 0;
            topWidth = tmp;
            tmp = 0;
            yindex ++;
            remainingStreams -= yNumber;
          } 
        }
        else{
          this.pwidth = (pcwidth) / (divider + 1);
          this.pheight = (pcheight) / (divider + 1);

          this.vwidth = (this.width) / (divider + 1);
          this.vheight = (this.height) / (divider + 1);

          if(stream.portrait == true){
            stream.width = this.pwidth;
            stream.height = this.pheight;
            stream.x = this.vwidth * xindex;
            stream.y = this.vheight * yindex;

            let xoffset = ( this.vwidth - this.pwidth ) / 2;
            stream.x += xoffset;  
          }
          else{
            stream.width = (this.vwidth);
            stream.height = (this.vheight);
            stream.x = this.vwidth * xindex;
            stream.y = this.vheight * yindex;
          }
          cropWidth = cropWidth + ((this.width) / (divider + 1))
          
          console.log("Video Width = " + stream.width + "VideoHeight = " + stream.height);

          if(xindex == 0){
            cropHeight = cropHeight + stream.height;
            console.debug("CropHeight = " + cropHeight);
          }

          xindex ++;
          if( xindex > yNumber){
            heightOffset = ((this.height) / (divider)) - stream.height;
            xindex = 0;
            yindex ++;
            widthOffset = this.width - cropWidth;
            this.canvas.setAttribute('width', cropWidth);
            console.log("New canvas width= " + cropWidth);
            topWidth = cropWidth;
            cropWidth = 0;
            extraStreams --;
            remainingStreams -= (yNumber + 1);
          }
        }
      }
      this.canvas.setAttribute('height', cropHeight);
    }

    start() {
      this.started = true
      this.requestAnimationFrameV2(this.draw.bind(this))
    
      // Get the result of merged stream canvas
      this.result = this.canvas.captureStream(this.fps)

      // Remove "dead" audio track
      const deadTrack = this.result.getAudioTracks()[0]
      if (deadTrack) this.result.removeTrack(deadTrack)

      // Add audio
      const audioTracks = this.audioDestination.stream.getAudioTracks()
      this.result.addTrack(audioTracks[0])
    }

    draw() {
      if (!this.started) return;
      this.frameCount++;
    
      let awaiting = this.streams.length;
      const done = () => {
        awaiting--;
        if (awaiting <= 0) {
          this.requestAnimationFrameV2(this.draw.bind(this));
        }
      }
      this.streams.forEach((stream) => {
      // default draw function
          const width = stream.width;
          const height = stream.height;
          this.ctx.drawImage(stream.element, stream.x, stream.y, width, height)
          done()
      })
    
      if (this.streams.length === 0) done()
    }

    //Mutes or unmutes given streamId in merged stream
    muteStream(streamId){
      for (let i = 0; i < this.streams.length; i++) {
        const stream = this.streams[i]
        if (streamId === stream.streamId) {
          if (stream.element && stream.mute == false) {
            stream.audioGainNode.gain.value = 0;
            stream.mute = true;
          }
          else if(stream.element && stream.mute == true){
            stream.audioGainNode.gain.value = 1;
            stream.mute = false;
          }
        }
      }
    }

    removeStream(streamId) { 
      let removed = false;
      for (let i = 0; i < this.streams.length; i++) {
        const stream = this.streams[i]
        if (streamId === stream.streamId) {
          if (stream.element) {
            stream.element.remove()
          }
          removed = true;
          this.streams[i] = null
          this.streams.splice(i, 1)
          i--
        }
      }
      console.log("removed streamId = " + streamId);

      if(this.autoMode == true){
        this.resizeAndSortV2();
      }
    }

    stop() {
      this.started = false
    
      this.streams.forEach(stream => {
        if (stream.element) {
          stream.element.remove()
        }
      })
      this.streams = []
      this.audioCtx.close()
      this.audioCtx = null
      this.audioDestination = null
      this.videoSyncDelayNode = null
    
      this.result.getTracks().forEach((track) => {
        track.stop()
      })
    
      this.result = null
    }
    
}
