// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* global currentTime */

const FRAME_PER_SECOND = 10;
const FRAME_INTERVAL = 1 / FRAME_PER_SECOND;

/**
 *  Measure microphone volume.
 *
 * @class VolumeMeter
 * @extends AudioWorkletProcessor
 */
class VolumeMeter extends AudioWorkletProcessor {

  constructor() {
    super();
    this._lastUpdate = currentTime;
    this._volume = 0;
    this.stop = false;
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        this.port.postMessage({ type: 'debug', message: "Stop command is received" });
        this.stop = true;
      }
    }   

  }

  calculateRMS(inputChannelData) {
    // Calculate the squared-sum.
    let sum = 0;
    for (let i = 0; i < inputChannelData.length; i++) {
      sum += inputChannelData[i] * inputChannelData[i];
    }

    // Calculate the RMS level and update the volume.
    let rms = Math.sqrt(sum / inputChannelData.length);
    this._volume = rms;
  }

  process(inputs, outputs) {
    const inputChannelData = inputs[0][0];

    // Post a message to the node every 16ms.
    if (currentTime - this._lastUpdate > FRAME_INTERVAL) {
      this.calculateRMS(inputChannelData);
      this.port.postMessage(this._volume);
      this._lastUpdate = currentTime;
    }

    return !this.stop;
  }
  /**
   * 
   * @param {*} message 
   */
  debug(message) {
    this.port.postMessage({ type: 'debug', message: message });
  }
}

registerProcessor("volume-meter", VolumeMeter);
