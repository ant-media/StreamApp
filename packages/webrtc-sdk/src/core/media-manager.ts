import type { GroupedDevices } from "./types.js";
import { Emitter } from "./emitter.js";
import type { EventMap } from "./events.js";

export interface MediaManagerOptions {
  mediaConstraints?: MediaStreamConstraints;
  localVideo?: HTMLVideoElement | null;
  debug?: boolean;
}

/**
 * Manages local media acquisition and device switching.
 */
export class MediaManager extends Emitter<EventMap> {
  private localStream: MediaStream | null = null;
  private localVideo: HTMLVideoElement | null;
  private constraints: MediaStreamConstraints;
  private screenVideoTrack: MediaStreamTrack | null = null;
  private screenShareAudioTrack: MediaStreamTrack | null = null;
  private cameraOverlayTrack: MediaStreamTrack | null = null;
  private overlayTimer: ReturnType<typeof setInterval> | null = null;
  private selectedVideoInputId: string | null = null;
  private selectedAudioInputId: string | null = null;
  private selectedAudioOutputId: string | null = null;
  private defaultDeviceListenerInstalled = false;
  private cameraDisabled = false;
  // v1 parity: keep a dummy canvas based black frame stream when camera is off
  private dummyCanvas: HTMLCanvasElement = document.createElement("canvas");
  private blackVideoTrack: MediaStreamTrack | null = null;
  private blackFrameTimer: ReturnType<typeof setInterval> | null = null;
  private replacementStream: MediaStream | null = null;

  /**
   * @param opts Media constraints and optional local preview element.
   */
  constructor(opts: MediaManagerOptions) {
    super();
    this.localVideo = opts.localVideo ?? null;
    this.constraints = opts.mediaConstraints ?? { video: true, audio: true };
  }

  /** Return the currently active local stream, if any. */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /** (Re)initialize local stream using current constraints and emit `devices_updated`. */
  async initLocalStream(): Promise<void> {
    // Stop and release any previously active tracks to avoid keeping devices (camera/mic) on
    if (this.localStream) {
      try {
        for (const track of this.localStream.getTracks()) {
          try {
            track.stop();
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
    const requestConstraints: MediaStreamConstraints = this.cameraDisabled
      ? { ...this.constraints, video: false }
      : this.constraints;
    const stream = await navigator.mediaDevices.getUserMedia(requestConstraints);
    this.localStream = stream;
    if (this.localVideo) this.localVideo.srcObject = stream;
    await this.refreshDevices();

    if (!this.defaultDeviceListenerInstalled) {
      this.defaultDeviceListenerInstalled = true;
      try {
        navigator.mediaDevices.addEventListener("devicechange", () => {
          // If default devices changed, re-open tracks with current constraints and replace
          void this.handleDeviceHotSwap();
        });
      } catch {
        // ignore if unsupported
      }
    }
  }

  async refreshDevices(): Promise<GroupedDevices> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const grouped: GroupedDevices = {
      videoInputs: devices
        .filter(d => d.kind === "videoinput")
        .map(d => ({ deviceId: d.deviceId, label: d.label })),
      audioInputs: devices
        .filter(d => d.kind === "audioinput")
        .map(d => ({ deviceId: d.deviceId, label: d.label })),
      audioOutputs: devices
        .filter(d => d.kind === "audiooutput")
        .map(d => ({ deviceId: d.deviceId, label: d.label })),
      selectedVideoInputId: this.selectedVideoInputId || undefined,
      selectedAudioInputId: this.selectedAudioInputId || undefined,
    };
    // audio output selection (sinkId) is media element specific; we expose last selected if available
    grouped.selectedAudioOutputId = this.selectedAudioOutputId || undefined;
    this.emit("devices_updated", grouped);
    return grouped;
  }

  /** Re-acquire default devices and replace local tracks; emits device_hotswapped. */
  private async handleDeviceHotSwap(): Promise<void> {
    try {
      const prevVideoId = this.selectedVideoInputId;
      const prevAudioId = this.selectedAudioInputId;
      // Re-enumerate devices
      const devs = await navigator.mediaDevices.enumerateDevices();
      const defaultCam = devs.find(d => d.kind === "videoinput");
      const defaultMic = devs.find(d => d.kind === "audioinput");
      // If user has explicitly selected ids, keep them. Otherwise use defaults.
      if (!prevVideoId && defaultCam) {
        const cam = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: defaultCam.deviceId } },
          audio: false,
        });
        const v = cam.getVideoTracks()[0];
        if (v) this.replaceLocalVideoTrack(v);
        this.emit("device_hotswapped", {
          kind: "videoinput",
          deviceId: defaultCam.deviceId,
        } as never);
      }
      if (!prevAudioId && defaultMic) {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: defaultMic.deviceId } },
          video: false,
        });
        const a = mic.getAudioTracks()[0];
        if (a) this.replaceLocalAudioTrack(a);
        this.emit("device_hotswapped", {
          kind: "audioinput",
          deviceId: defaultMic.deviceId,
        } as never);
      }
      await this.refreshDevices();
    } catch (e) {
      this.emit("error", { error: "device_hotswap_failed", message: e } as never);
    }
  }

  /** Enumerate and group available input/output devices. */
  async listDevices(): Promise<GroupedDevices> {
    return this.refreshDevices();
  }

  /** Pause local track of given kind (audio/video) without renegotiation. */
  pauseLocalTrack(kind: "audio" | "video"): void {
    if (!this.localStream) return;
    const tracks =
      kind === "video" ? this.localStream.getVideoTracks() : this.localStream.getAudioTracks();
    for (const t of tracks) t.enabled = false;
    this.emit("local_track_paused", { kind } as never);
  }

  /** Resume local track of given kind (audio/video). */
  resumeLocalTrack(kind: "audio" | "video"): void {
    if (!this.localStream) return;
    const tracks =
      kind === "video" ? this.localStream.getVideoTracks() : this.localStream.getAudioTracks();
    for (const t of tracks) t.enabled = true;
    this.emit("local_track_resumed", { kind } as never);
  }

  /** Update video constraints to use a specific deviceId or facingMode and refresh stream. */
  async selectVideoInput(source: string | { facingMode: "user" | "environment" }): Promise<void> {
    const video: MediaTrackConstraints =
      typeof source === "string"
        ? { deviceId: { exact: source } }
        : { facingMode: source.facingMode };
    this.constraints = { ...this.constraints, video };
    this.selectedVideoInputId = typeof source === "string" ? source : null;
    // Reacquire only video for performance and replace in-place (v1 parity)
    const cam = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    const vtrack = cam.getVideoTracks()[0];
    if (vtrack) this.replaceLocalVideoTrack(vtrack);
    await this.refreshDevices();
  }

  /** Set audio output device (sinkId) for a given media element; stores selection for future emits. */
  async setAudioOutput(deviceId: string, element?: HTMLMediaElement | null): Promise<void> {
    const target: HTMLMediaElement | null = element ?? (this.localVideo as HTMLMediaElement | null);
    this.selectedAudioOutputId = deviceId || null;
    if (!target) return;
    const anyEl = target as unknown as { setSinkId?: (id: string) => Promise<void> };
    if (typeof anyEl.setSinkId === "function") {
      try {
        await anyEl.setSinkId(deviceId);
      } catch (e) {
        // surface via event channel
        this.emit("error", { error: "set_sink_id_failed", message: e } as never);
      }
    } else {
      this.emit("error", { error: "set_sink_id_unsupported", message: target } as never);
    }
    await this.refreshDevices();
  }

  /** Update audio constraints to use a specific deviceId and refresh stream. */
  async selectAudioInput(deviceId: string): Promise<void> {
    const audio: MediaTrackConstraints = { deviceId: { exact: deviceId } };
    this.constraints = { ...this.constraints, audio };
    this.selectedAudioInputId = deviceId;
    // Reacquire only audio and replace in-place (v1 parity)
    const onlyAudio = await navigator.mediaDevices.getUserMedia({ audio, video: false });
    const atrack = onlyAudio.getAudioTracks()[0];
    if (atrack) this.replaceLocalAudioTrack(atrack);
    await this.refreshDevices();
  }

  /**
   * Turn off the camera device: stop and remove local video track(s).
   * This turns off the camera light without renegotiation. Remote side will see video muted.
   */
  turnOffLocalCamera(): void {
    this.cameraDisabled = true;
    // Initialize black dummy frame and keep sending at intervals similar to v1
    this.getBlackVideoTrack();
    const vtrack = this.replacementStream?.getVideoTracks()[0] || this.blackVideoTrack;
    if (vtrack) this.replaceLocalVideoTrack(vtrack);
    if (this.localVideo && this.localVideo.srcObject !== this.localStream) {
      this.localVideo.srcObject = this.localStream as MediaStream;
    }
  }

  /**
   * Re-enable camera: if no local video track exists, reacquire one with current constraints and add it.
   * Does not renegotiate; callers should use replaceTrack on senders (handled by adaptor.applyLocalTracks).
   */
  async turnOnLocalCamera(): Promise<void> {
    this.cameraDisabled = false;
    this.clearBlackVideoTrackTimer();
    this.stopBlackVideoTrack();
    const videoConstraints =
      (this.constraints && (this.constraints as MediaStreamConstraints).video) ?? true;
    const cam = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });
    const vtrack = cam.getVideoTracks()[0];
    if (vtrack) this.replaceLocalVideoTrack(vtrack);
  }

  // v1 parity helpers for black dummy track
  private getBlackVideoTrack(): MediaStreamTrack | null {
    const ctx = this.dummyCanvas.getContext("2d");
    if (ctx) {
      if (this.dummyCanvas.width !== 320) {
        this.dummyCanvas.width = 320;
        this.dummyCanvas.height = 240;
      }
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, this.dummyCanvas.width, this.dummyCanvas.height);
    }
    // Always recapture to ensure a fresh live track
    this.replacementStream = this.dummyCanvas.captureStream(1);
    if (!this.blackFrameTimer) {
      this.blackFrameTimer = setInterval(() => {
        const c = this.dummyCanvas.getContext("2d");
        if (!c) return;
        c.fillStyle = "black";
        c.fillRect(0, 0, this.dummyCanvas.width, this.dummyCanvas.height);
      }, 3000);
    }
    this.blackVideoTrack = this.replacementStream.getVideoTracks()[0] ?? null;
    return this.blackVideoTrack;
  }

  private clearBlackVideoTrackTimer(): void {
    if (this.blackFrameTimer) {
      clearInterval(this.blackFrameTimer);
      this.blackFrameTimer = null;
    }
  }

  private stopBlackVideoTrack(): void {
    if (this.blackVideoTrack) {
      try {
        this.blackVideoTrack.stop();
      } catch {
        // ignore
      }
      this.blackVideoTrack = null;
    }
    this.replacementStream = null;
  }

  /** Disable sending from the current local audio track(s). */
  muteLocalMic(): void {
    if (!this.localStream) return;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = false;
    }
  }

  /** Enable sending from the current local audio track(s). */
  unmuteLocalMic(): void {
    if (!this.localStream) return;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = true;
    }
  }

  /** Replace local video track with a screen capture track. If system audio is available, mix with mic. */
  async startScreenShare(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const screen = (await (navigator.mediaDevices as any).getDisplayMedia({
      video: true,
      audio: true,
    })) as MediaStream;
    const vtrack = screen.getVideoTracks()[0];
    if (!vtrack) return;
    this.screenVideoTrack = vtrack;

    // Mix system audio with mic if present
    let mixed: MediaStream | null = null;
    const hasSystemAudio = screen.getAudioTracks().length > 0;
    if (hasSystemAudio) {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: this.constraints.audio ?? true,
        video: false,
      });
      mixed = this.mixAudioStreams(screen, mic);
    }

    this.replaceLocalVideoTrack(vtrack);
    const audioTrack = mixed
      ? mixed.getAudioTracks()[0]
      : (
          await navigator.mediaDevices.getUserMedia({
            audio: this.constraints.audio ?? true,
            video: false,
          })
        ).getAudioTracks()[0];
    if (audioTrack) this.replaceLocalAudioTrack(audioTrack);

    vtrack.onended = () => {
      void this.stopScreenShare();
    };
  }

  /** Restore camera video track by reinitializing getUserMedia with current constraints. */
  async stopScreenShare(): Promise<void> {
    if (this.screenVideoTrack) {
      try {
        this.screenVideoTrack.stop();
      } catch (err) {
        console.error(err);
      }
      this.screenVideoTrack = null;
    }
    if (this.screenShareAudioTrack) {
      try {
        this.screenShareAudioTrack.stop();
      } catch {
        // ignore
      }
      this.screenShareAudioTrack = null;
    }
    await this.initLocalStream();
  }

  /** Start screen+camera overlay mode using canvas composition (v1 parity). */
  async startScreenWithCameraOverlay(): Promise<void> {
    // get screen video
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const screen = (await (navigator.mediaDevices as any).getDisplayMedia({
      video: true,
      audio: false,
    })) as MediaStream;
    const screenTrack = screen.getVideoTracks()[0];
    if (!screenTrack) return;

    // get camera video only
    const cam = await navigator.mediaDevices.getUserMedia({
      video: this.constraints.video ?? true,
      audio: false,
    });
    const camTrack = cam.getVideoTracks()[0] ?? null;
    this.cameraOverlayTrack = camTrack;

    // prepare elements and canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const screenVideo = document.createElement("video");
    const camVideo = document.createElement("video");
    screenVideo.srcObject = new MediaStream([screenTrack]);
    camVideo.srcObject = camTrack ? new MediaStream([camTrack]) : null;
    screenVideo.muted = true;
    camVideo.muted = true;
    await Promise.all([screenVideo.play().catch(() => {}), camVideo.play().catch(() => {})]);

    const canvasStream = canvas.captureStream(15);

    // attach onended to auto-restore
    screenTrack.onended = () => {
      void this.stopScreenWithCameraOverlay();
      this.emit("notification:screen_share_stopped" as keyof EventMap, undefined as never);
    };

    // draw loop roughly 15fps
    const draw = () => {
      if (!ctx || screenVideo.videoWidth === 0 || screenVideo.videoHeight === 0) return;
      canvas.width = screenVideo.videoWidth;
      canvas.height = screenVideo.videoHeight;
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      if (!this.cameraDisabled && camVideo.videoWidth > 0 && camVideo.videoHeight > 0) {
        const insetW = Math.floor(canvas.width * 0.15);
        const insetH = Math.floor((camVideo.videoHeight / camVideo.videoWidth) * insetW);
        const x = canvas.width - insetW - 15;
        const y = 15; // top-right
        ctx.drawImage(camVideo, x, y, insetW, insetH);
      }
    };
    this.overlayTimer = setInterval(draw, 66);

    // replace outgoing video with canvas stream
    const vtrack = canvasStream.getVideoTracks()[0];
    this.screenVideoTrack = screenTrack;
    if (vtrack) this.replaceLocalVideoTrack(vtrack);
  }

  /** Stop screen+camera overlay and restore camera. */
  async stopScreenWithCameraOverlay(): Promise<void> {
    if (this.overlayTimer) {
      clearInterval(this.overlayTimer);
      this.overlayTimer = null;
    }
    if (this.screenVideoTrack) {
      try {
        this.screenVideoTrack.stop();
      } catch {
        // ignore
      }
      this.screenVideoTrack = null;
    }
    if (this.cameraOverlayTrack) {
      try {
        this.cameraOverlayTrack.stop();
      } catch {
        // ignore
      }
      this.cameraOverlayTrack = null;
    }
    await this.initLocalStream();
  }

  // ===== Audio utilities (parity) =====
  private audioContext: AudioContext | null = null;
  private primaryGainNode: GainNode | null = null;
  private secondaryGainNode: GainNode | null = null;
  private localMeterProc?: (level: number) => void;
  private localMeterTimer: ReturnType<typeof setInterval> | null = null;
  private mutedProbeStream: MediaStream | null = null;
  private lastVolume = 1;
  private gainInputStream: MediaStream | null = null;

  /** Set output volume (0..1) for local publishing stream. */
  setVolumeLevel(level: number): void {
    this.lastVolume = Math.max(0, Math.min(1, level));
    if (!this.primaryGainNode) {
      this.installGainNodeForLocalAudio();
    }
    if (this.primaryGainNode) this.primaryGainNode.gain.value = this.lastVolume;
  }

  /** Ensure local audio runs through a GainNode for volume control and replace the track.
   *  Important: Use a dedicated mic capture stream as source to avoid feedback loops with localStream.
   */
  private installGainNodeForLocalAudio(): void {
    if (!this.localStream) return;
    // stop previous dedicated mic stream if exists
    if (this.gainInputStream) {
      for (const t of this.gainInputStream.getTracks()) t.stop();
      this.gainInputStream = null;
    }
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    // Acquire a fresh mic-only stream for processing
    const setup = async () => {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.gainInputStream = mic;
      if (!this.audioContext) this.audioContext = new AudioContext();
      const ctx = this.audioContext;
      const source = ctx.createMediaStreamSource(mic);
      const destination = ctx.createMediaStreamDestination();
      this.primaryGainNode = ctx.createGain();
      this.primaryGainNode.gain.value = this.lastVolume;
      source.connect(this.primaryGainNode).connect(destination);
      const processedTrack = destination.stream.getAudioTracks()[0];
      if (processedTrack) this.replaceLocalAudioTrack(processedTrack);
    };
    // Fire and forget; caller just needs the chain installed
    void setup();
  }

  /** Mix system audio (screen) and mic into a single audio track. */
  private mixAudioStreams(screen: MediaStream, mic: MediaStream): MediaStream {
    const composed = new MediaStream();
    // Keep screen video in composed stream
    screen.getVideoTracks().forEach(t => composed.addTrack(t));
    if (!this.audioContext) this.audioContext = new AudioContext();
    const ctx = this.audioContext;
    const destination = ctx.createMediaStreamDestination();
    // system audio (primary)
    if (screen.getAudioTracks().length > 0) {
      const sys = new MediaStream([screen.getAudioTracks()[0]]);
      const s1 = ctx.createMediaStreamSource(sys);
      this.primaryGainNode = this.primaryGainNode || ctx.createGain();
      this.primaryGainNode.gain.value = this.lastVolume;
      s1.connect(this.primaryGainNode).connect(destination);
      this.screenShareAudioTrack = screen.getAudioTracks()[0];
    }
    // mic audio (secondary)
    if (mic.getAudioTracks().length > 0) {
      const m = new MediaStream([mic.getAudioTracks()[0]]);
      const s2 = ctx.createMediaStreamSource(m);
      this.secondaryGainNode = this.secondaryGainNode || ctx.createGain();
      this.secondaryGainNode.gain.value = 1;
      s2.connect(this.secondaryGainNode).connect(destination);
    }
    destination.stream.getAudioTracks().forEach(t => composed.addTrack(t));
    return composed;
  }

  /** Enable/disable secondary (mic) audio in mixed audio mode. */
  enableSecondStreamInMixedAudio(enable: boolean): void {
    if (this.secondaryGainNode) this.secondaryGainNode.gain.value = enable ? 1 : 0;
  }

  /** Enable simple audio level metering for the local stream. */
  async enableAudioLevelForLocalStream(
    callback: (level: number) => void,
    periodMs = 200
  ): Promise<void> {
    if (!this.localStream) return;
    if (!this.audioContext) this.audioContext = new AudioContext();
    const ctx = this.audioContext;
    const src = ctx.createMediaStreamSource(this.localStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    this.localMeterProc = callback;
    if (this.localMeterTimer) clearInterval(this.localMeterTimer);
    this.localMeterTimer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      // rough RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      callback(rms);
    }, periodMs);
  }

  disableAudioLevelForLocalStream(): void {
    if (this.localMeterTimer) {
      clearInterval(this.localMeterTimer);
      this.localMeterTimer = null;
    }
    this.localMeterProc = undefined;
  }

  /** Probe mic while muted to notify if speaking. */
  async enableAudioLevelWhenMuted(
    callback: (speaking: boolean) => void,
    threshold = 0.1
  ): Promise<void> {
    if (!this.audioContext) this.audioContext = new AudioContext();
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.mutedProbeStream = probe;
    await this.enableAudioLevelForLocalStream(level => {
      callback(level > threshold);
    }, 200);
  }

  disableAudioLevelWhenMuted(): void {
    if (this.mutedProbeStream) {
      for (const t of this.mutedProbeStream.getTracks()) t.stop();
      this.mutedProbeStream = null;
    }
    this.disableAudioLevelForLocalStream();
  }

  private replaceLocalVideoTrack(newTrack: MediaStreamTrack): void {
    if (!this.localStream) {
      this.localStream = new MediaStream([newTrack]);
      if (this.localVideo) this.localVideo.srcObject = this.localStream;
      return;
    }
    // remove existing video tracks
    for (const t of this.localStream.getVideoTracks()) {
      this.localStream.removeTrack(t);
      try {
        t.stop();
      } catch (err) {
        console.error(err);
      }
    }
    this.localStream.addTrack(newTrack);
    if (this.localVideo && this.localVideo.srcObject !== this.localStream) {
      this.localVideo.srcObject = this.localStream;
    }
  }

  private replaceLocalAudioTrack(newTrack: MediaStreamTrack): void {
    if (!this.localStream) {
      this.localStream = new MediaStream([newTrack]);
      if (this.localVideo) this.localVideo.srcObject = this.localStream;
      this.emit("local_tracks_changed", undefined as never);
      return;
    }
    const prev = this.localStream.getAudioTracks()[0];
    // Add new first to keep continuity, then remove/stop previous shortly after
    this.localStream.addTrack(newTrack);
    this.emit("local_tracks_changed", undefined as never);
    if (prev) {
      setTimeout(() => {
        try {
          this.localStream?.removeTrack(prev);
          prev.stop();
        } catch (err) {
          console.error(err);
        }
      }, 50);
    }
    if (this.localVideo && this.localVideo.srcObject !== this.localStream) {
      this.localVideo.srcObject = this.localStream;
    }
  }
}
