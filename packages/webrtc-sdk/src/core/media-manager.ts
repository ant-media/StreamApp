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
  private selectedVideoInputId: string | null = null;
  private selectedAudioInputId: string | null = null;

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
    const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
    this.localStream = stream;
    if (this.localVideo) this.localVideo.srcObject = stream;
    await this.refreshDevices();
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
    grouped.selectedAudioOutputId = undefined;
    this.emit("devices_updated", grouped);
    return grouped;
  }

  /** Enumerate and group available input/output devices. */
  async listDevices(): Promise<GroupedDevices> {
    return this.refreshDevices();
  }

  /** Update video constraints to use a specific deviceId or facingMode and refresh stream. */
  async selectVideoInput(source: string | { facingMode: "user" | "environment" }): Promise<void> {
    const video: MediaTrackConstraints =
      typeof source === "string"
        ? { deviceId: { exact: source } }
        : { facingMode: source.facingMode };
    this.constraints = { ...this.constraints, video };
    this.selectedVideoInputId = typeof source === "string" ? source : null;
    await this.initLocalStream();
  }

  /** Update audio constraints to use a specific deviceId and refresh stream. */
  async selectAudioInput(deviceId: string): Promise<void> {
    const audio: MediaTrackConstraints = { deviceId: { exact: deviceId } };
    this.constraints = { ...this.constraints, audio };
    this.selectedAudioInputId = deviceId;
    await this.initLocalStream();
  }

  /**
   * Turn off the camera device: stop and remove local video track(s).
   * This turns off the camera light without renegotiation. Remote side will see video muted.
   */
  turnOffLocalCamera(): void {
    if (!this.localStream) return;
    const videoTracks = this.localStream.getVideoTracks();
    for (const track of videoTracks) {
      try {
        track.stop();
      } catch (err) {
        console.error(err);
      }
      this.localStream.removeTrack(track);
    }
    if (this.localVideo && this.localVideo.srcObject !== this.localStream) {
      this.localVideo.srcObject = this.localStream;
    }
  }

  /**
   * Re-enable camera: if no local video track exists, reacquire one with current constraints and add it.
   * Does not renegotiate; callers should use replaceTrack on senders (handled by adaptor.applyLocalTracks).
   */
  async turnOnLocalCamera(): Promise<void> {
    if (!this.localStream) {
      await this.initLocalStream();
      return;
    }
    const existing = this.localStream.getVideoTracks();
    if (existing.length > 0) {
      for (const track of existing) track.enabled = true;
      return;
    }
    const videoConstraints =
      (this.constraints && (this.constraints as MediaStreamConstraints).video) ?? true;
    const cam = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });
    const vtrack = cam.getVideoTracks()[0];
    if (vtrack) this.replaceLocalVideoTrack(vtrack);
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

  /** Replace local video track with a screen capture track. */
  async startScreenShare(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const screen = await (navigator.mediaDevices as any).getDisplayMedia({
      video: true,
      audio: false,
    });
    const vtrack = (screen as MediaStream).getVideoTracks()[0];
    if (!vtrack) return;
    this.replaceLocalVideoTrack(vtrack);
    this.screenVideoTrack = vtrack;
    // auto-stop when user ends share
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
    await this.initLocalStream();
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
}
