/*
  Based on @eyevinn/whip-web-client "whip-client.js" from
  https://cdn.jsdelivr.net/npm/@eyevinn/whip-web-client/dist/whip-client.modern.js

  The @eyevinn/whip-web-client library version became broken in our usage context (module pulling Node deps)
  >This is modified variant to work with browsers
*/

export class WhipClient {
	constructor({ endpoint, opts = {} }) {
		this.endpoint = new URL(endpoint, window.location.href).toString();
		this.opts = {
			debug: !!opts.debug,
			iceServers: opts.iceServers || [{ urls: "stun:stun.l.google.com:19302" }],
			authkey: opts.authkey,
			noTrickleIce: !!opts.noTrickleIce,
			timeout: opts.timeout || 2000
		};
		this.peer = null;
		this.resourceUrl = null;
		this.eTag = null;
		this.extensions = [];
		this.iceCredentials = null;
		this.mediaMids = [];
		this.waitingForCandidates = false;
		this.iceGatheringTimer = null;
		this._initPeer();
	}
	log(...args) { if (this.opts.debug) console.log("WHIPClient", ...args); }
	error(...args) { console.error("WHIPClient", ...args); }
	_initPeer() {
		this.peer = new RTCPeerConnection({ iceServers: this.opts.iceServers });
		this.peer.addEventListener("iceconnectionstatechange", () => this.log("iceConnectionState", this.peer.iceConnectionState));
		this.peer.addEventListener("icecandidateerror", (e) => this.log("iceCandidateError", e));
		this.peer.addEventListener("connectionstatechange", async () => {
			this.log("connectionState", this.peer.connectionState);
			if (this.peer.connectionState === "failed") {
				await this.destroy();
			}
		});
		this.peer.addEventListener("icegatheringstatechange", () => {
			if (this.peer.iceGatheringState === "complete" && !this._supportsTrickle() && this.waitingForCandidates) {
				this._onDoneWaitingForCandidates();
			}
		});
		this.peer.addEventListener("icecandidate", (evt) => this._onIceCandidate(evt));
	}
	_supportsTrickle() { return !this.opts.noTrickleIce; }
	supportTrickleIce() { return this._supportsTrickle(); }
	getICEConnectionState() { return this.peer?.iceConnectionState; }
	async getResourceExtensions() { return this.extensions; }
	async _probePatchSupport() {
		try {
			const headers = {};
			if (this.opts.authkey) headers["Authorization"] = this.opts.authkey;
			const res = await fetch(this.endpoint, { method: "OPTIONS", headers });
			if (res && res.ok) {
				const allow = res.headers.get("access-control-allow-methods") || res.headers.get("Allow") || "";
				const supportsPatch = allow.toUpperCase().split(",").map(s => s.trim()).includes("PATCH");
				this.opts.noTrickleIce = !supportsPatch;
				this.log("PATCH support:", supportsPatch);
			}
		} catch (e) {
			this.log("OPTIONS probe failed", e);
		}
	}
	_extractIceAndMidsFromLocalSDP() {
		const sdp = this.peer.localDescription?.sdp || "";
		let ufrag = null, pwd = null;
		const sessUfrag = sdp.match(/^a=ice-ufrag:(.*)$/m);
		const sessPwd = sdp.match(/^a=ice-pwd:(.*)$/m);
		if (sessUfrag && sessPwd) {
			ufrag = sessUfrag[1].trim();
			pwd = sessPwd[1].trim();
		} else {
			const mu = sdp.match(/^a=ice-ufrag:(.*)$/m);
			const mp = sdp.match(/^a=ice-pwd:(.*)$/m);
			if (mu && mp) { ufrag = mu[1].trim(); pwd = mp[1].trim(); }
		}
		const mids = [];
		const midRegex = /^a=mid:([^\r\n]+)/gm;
		let m;
		while ((m = midRegex.exec(sdp)) !== null) { mids.push(m[1]); }
		this.iceCredentials = (ufrag && pwd) ? { ufrag, pwd } : null;
		this.mediaMids = mids;
	}
	_buildTrickleSdpFrag(candidate) {
		if (!this.iceCredentials) { this.error("No ICE creds for trickle"); return null; }
		const lines = [
			`a=ice-ufrag:${this.iceCredentials.ufrag}`,
			`a=ice-pwd:${this.iceCredentials.pwd}`
		];
		const targetMids = candidate.sdpMid ? [candidate.sdpMid] : (this.mediaMids.length ? this.mediaMids : ["0"]);
		for (const mid of targetMids) {
			lines.push("m=audio 9 UDP/TLS/RTP/SAVPF 0");
			lines.push(`a=mid:${mid}`);
			lines.push(`a=${candidate.candidate}`);
		}
		return lines.join("\r\n") + "\r\n";
	}
	async _onIceCandidate(evt) {
		const cand = evt.candidate;
		if (!cand) return;
		if (!this._supportsTrickle() || !this.resourceUrl || !this.eTag) return;
		const frag = this._buildTrickleSdpFrag(cand);
		if (!frag) return;
		try {
			const res = await fetch(this.resourceUrl, {
				method: "PATCH",
				headers: { "Content-Type": "application/trickle-ice-sdpfrag", "ETag": this.eTag },
				body: frag
			});
			if (!res.ok) {
				this.log("Trickle ICE not accepted, disabling", res.status);
				this.opts.noTrickleIce = true;
			}
		} catch (e) {
			this.log("Trickle ICE patch failed", e);
			this.opts.noTrickleIce = true;
		}
	}
	async _sendOffer() {
		this.log("Sending offer");
		const headers = { "Content-Type": "application/sdp" };
		if (this.opts.authkey) headers["Authorization"] = this.opts.authkey;
		const res = await fetch(this.endpoint, { method: "POST", headers, body: this.peer.localDescription.sdp });
		if (!res.ok) {
			const msg = await res.text().catch(() => "");
			throw new Error(`WHIP POST failed: ${res.status} ${res.statusText} ${msg}`);
		}
		let loc = res.headers.get("Location") || res.headers.get("location");
		if (loc && !/^https?:/i.test(loc)) {
			loc = new URL(loc, this.endpoint).toString();
		}
		this.resourceUrl = loc || null;
		this.eTag = res.headers.get("ETag");
		const link = res.headers.get("Link");
		if (link) this.extensions = link.split(",").map(s => s.trim());
		const answerSdp = await res.text();
		await this.peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
	}
	_onDoneWaitingForCandidates() {
		clearTimeout(this.iceGatheringTimer);
		this.waitingForCandidates = false;
		this._sendOffer().catch(e => this.error(e));
	}
	async _startSdpExchange() {
		const offer = await this.peer.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
		await this.peer.setLocalDescription(offer);
		this._extractIceAndMidsFromLocalSDP();
		if (this._supportsTrickle()) {
			await this._sendOffer();
		} else {
			this.waitingForCandidates = true;
			this.iceGatheringTimer = setTimeout(() => this._onDoneWaitingForCandidates(), this.opts.timeout);
		}
	}
	async setIceServersFromEndpoint() {
		if (!this.opts.authkey) { this.error("No authkey provided for ICE fetch"); return; }
		try {
			const res = await fetch(this.endpoint, { method: "OPTIONS", headers: { "Authorization": this.opts.authkey } });
			if (!res.ok) return;
			const ice = [];
			res.headers.forEach((value, key) => {
				if (key.toLowerCase() === "link") {
					// Parse Link headers for ice-server entries per WHIP recommendations
					value.split(",").forEach(part => {
						const p = part.trim();
						const m = p.match(/<([^>]+)>;\s*rel="ice-server"(?:;\s*username="?([^";]+)"?)?(?:;\s*credential="?([^";]+)"?)?/i);
						if (m) {
							const url = m[1];
							const username = m[2];
							const credential = m[3];
							const server = { urls: url };
							if (username) server.username = username;
							if (credential) server.credential = credential;
							ice.push(server);
						}
					});
				}
			});
			if (ice.length) this.peer.setConfiguration({ iceServers: ice });
		} catch (e) {
			this.log("ICE servers fetch failed", e);
		}
	}
	async ingest(mediaStream) {
		if (!this.peer) this._initPeer();
		mediaStream.getTracks().forEach(track => this.peer.addTrack(track, mediaStream));
		if (this.opts.noTrickleIce === false) {
			await this._probePatchSupport();
		} else if (this.opts.noTrickleIce === undefined) {
			await this._probePatchSupport();
		}
		await this._startSdpExchange();
	}
	async destroy() {
		try {
			if (this.resourceUrl) {
				await fetch(this.resourceUrl, { method: "DELETE" }).catch(() => {});
			}
		} finally {
			try { this.peer?.getSenders()?.forEach(s => { try { s.track && s.track.stop(); } catch (e) {} }); } catch (e) {}
			try { this.peer?.close(); } catch (e) {}
			this.peer = null;
			this.resourceUrl = null;
		}
	}
} 