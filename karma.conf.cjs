module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
			{ pattern: "src/test/**/*.js", type: "module" },
		
			{ pattern: "node_modules/video.js/dist/video.js", included: true },
			{ pattern: "node_modules/dashjs/dist/dash.all.min.js", included: true },
			{ pattern: "node_modules/aframe/dist/aframe.min.js", included: true },
			{ pattern: "src/main/js/*.js", included: false },
			{ pattern: "src/main/js/external/*.js", included: false },
			
	],
    
    
    reporters: ['progress', 'coverage'],

    
    preprocessors: {
    	'src/main/js/*.js': ['coverage'],
  	},
  
	coverageReporter: {
  		reporters: [
					{type: 'lcov', dir:'coverage/lcov'},
					{type: 'text'},
					{type: 'html', dir:'coverage/html'}
  		],
    
	}, 
  
    port: 9876,  // karma web server port
    
    colors: true,
    
    logLevel: config.LOG_INFO,
    
    browsers: ['CustomChrome', "ChromeMobileUserAgent"],
    //browsers: ['Chrome'],
    

	customLaunchers: {
	  CustomChrome: {
	    base: 'Chrome',
	    flags: [
				'--headless',
	    		'--disable-gpu', 
				"--headless=new",
				"--no-sandbox",
				"--disable-dev-shm-usage",
				"--log-level=1",
				"--remote-allow-origins=*",
				"--use-fake-ui-for-media-stream",
				"--use-fake-device-for-media-stream",
				"--autoplay-policy=no-user-gesture-required",
				]
	  },
	  
	  ChromeMobileUserAgent: {
	    base: 'Chrome',
	    flags: [
				'--headless',
	    		'--disable-gpu', 
				"--headless=new",
				"--no-sandbox",
				"--disable-dev-shm-usage",
				"--log-level=1",
				"--remote-allow-origins=*",
				"--use-fake-ui-for-media-stream",

				"--use-fake-device-for-media-stream",
				'--user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1"',
				"--autoplay-policy=no-user-gesture-required",
				]
	  },
	  
	},
	    
    autoWatch: true,
    
    singleRun: true, // Karma captures browsers, runs the tests and exits
    //singleRun: false,
    
    concurrency: Infinity,
  })
}            
