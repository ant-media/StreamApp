import {SoundMeter} from '../../../main/webapp/js/soundmeter.js';


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
			let stream = new MediaStream();
			soundMeter.context.createMediaStreamSource = sinon.mock();
			let fakeMediaStreamSourceNode = sinon.mock();
			const fakeMediaStream = sinon.fake.returns(fakeMediaStreamSourceNode);
			sinon.replace(soundMeter.context, 'createMediaStreamSource', fakeMediaStream);

			let levelCallback = function (level) {
				console.log('level', level);
			};
			let errorCallback = function (error) {
				console.log('error', error);
				expect.should.fail(error);
			};
			
			soundMeter.connectToSource(stream, levelCallback, errorCallback);

			let event = {"data": { "volume": 0.5, "type": "volume" }};

			let fakeMessagePort = sinon.mock();
			soundMeter.volumeMeterNode = sinon.mock();
			soundMeter.volumeMeterNode.port = sinon.fake.returns(fakeMessagePort);
			soundMeter.volumeMeterNode.port.onmessage = sinon.fake();
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
			let stream = new MediaStream();
			soundMeter.context.createMediaStreamSource = sinon.mock();
			let fakeMediaStreamSourceNode = sinon.mock();
			const fakeMediaStream = sinon.fake.returns(fakeMediaStreamSourceNode);
			sinon.replace(soundMeter.context, 'createMediaStreamSource', fakeMediaStream);

			soundMeter.connectToSource(stream, () => {}, () => {});

			soundMeter.stop();

			expect(soundMeter.mic).to.be.null;
			expect(soundMeter.volumeMeterNode).to.be.null;
		}
		catch (err) {
			expect.fail(err);
		}

	});

});
