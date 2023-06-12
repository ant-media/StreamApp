
import { SoundMeter } from '../../../main/webapp/js/soundmeter.js';


describe("SoundMeter", function() {

	var clock;

	var sandbox;

	var initialized = false;

	beforeEach(function () {
	  clock = sinon.useFakeTimers();
	  sandbox = sinon.createSandbox();
	  sinon.mock("./volume-meter-processor.js");
	});


	afterEach(() => {
	  // Restore the default sandbox here
	  sinon.restore();
	  clock.restore();
	  sandbox.restore();
	});


	it("Initialize", async function() {

		try {
			let context = new AudioContext();
			var soundMeter = new SoundMeter(context);
			expect(soundMeter.context).to.be.equal(context);
		}
		catch (err) {
			expect.fail(err);
		}

	});

	it("Connect To Audio Source", async function() {

		try {
			let context = new AudioContext();
			var soundMeter = new SoundMeter(context);
			this.timeout(60000);
			let stream = null;
			let levelCallback = function (level) {
				console.log('level', level);
				done();
			};
			let errorCallback = function (error) {
				console.log('error', error);
				done(error);
			};
			soundMeter.connectToSource(stream, levelCallback, errorCallback);
		}
		catch (err) {
			expect.fail(err);
		}

	});

	it("Volume Meter On Message Test", async function() {

		try {
			let context = new AudioContext();
			var soundMeter = new SoundMeter(context);
			let stream = sinon.mock();
			soundMeter.context.createMediaStreamSource = sinon.mock();
			sinon.fake(soundMeter.context, 'createMediaStreamSource')
			let levelCallback = function (level) {
				console.log('level', level);
			};
			let errorCallback = function (error) {
				console.log('error', error);
				expect.should.fail(error);
			};
			soundMeter.connectToSource(stream, levelCallback, errorCallback);
			let event = {"data": { "volume": 0.5, "type": "volume" }};
			soundMeter.volumeMeterNode.port.onmessage(event);
		}
		catch (err) {
			expect.fail(err);
		}

	});

	it("Stop", async function() {

		try {
			let context = new AudioContext();
			var soundMeter = new SoundMeter(context);
			let stream = sinon.mock();
			soundMeter.context.audioWorklet = sinon.mock();
			soundMeter.connectToSource(stream, () => {}, () => {});

			expect(soundMeter.mic).to.not.be.null;
			expect(soundMeter.volumeMeterNode).to.not.be.null;

			soundMeter.stop();

			expect(soundMeter.mic).to.be.null;
			expect(soundMeter.volumeMeterNode).to.be.null;
		}
		catch (err) {
			expect.fail(err);
		}

	});

});
