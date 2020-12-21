

export class StreamMerger{
  constructor(width, height){
      this.streams = [];
      this.width = width;
      this.height = height;
      const AudioContext = window.AudioContext || window.webkitAudioContext
      this.audioCtx = new AudioContext();
      this.audioDestination = this.audioCtx.createMediaStreamDestination()


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
      this.streams.push(stream)
      console.log("Added stream Id = " + stream.streamId);
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
    updateIndex(){

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
    }

    stop() {
      this.started = false
    
      this.streams.forEach(stream => {
        if (stream.element) {
          stream.element.remove()
        }
      })
      this.streams = []
      //this.audioCtx.close()
      //this.audioCtx = null
      //this.audioDestination = null
      //this.videoSyncDelayNode = null
    
      this.result.getTracks().forEach((track) => {
        track.stop()
      })
    
      this.result = null
    }
    
}
