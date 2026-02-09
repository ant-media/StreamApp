export class PeerStats {
  streamId: string;
  averageOutgoingBitrate?: number;
  currentOutgoingBitrate?: number;
  averageIncomingBitrate?: number;
  currentIncomingBitrate?: number;
  totalBytesSent?: number;
  totalBytesReceived?: number;
  currentTimestamp?: number;
  // Extended parity fields
  audioPacketsLost?: number;
  videoPacketsLost?: number;
  audioPacketsSent?: number;
  videoPacketsSent?: number;
  audioPacketsReceived?: number;
  videoPacketsReceived?: number;
  audioRoundTripTime?: number;
  videoRoundTripTime?: number;
  audioJitter?: number;
  videoJitter?: number;
  frameWidth?: number;
  frameHeight?: number;
  framesEncoded?: number;
  framesDecoded?: number;
  framesDropped?: number;
  framesReceived?: number;
  availableOutgoingBitrateKbps?: number;
  currentRoundTripTime?: number;

  constructor(streamId: string) {
    this.streamId = streamId;
  }
}
