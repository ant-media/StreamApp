module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
			{ pattern: "src/test/js/**/*.js", type: "module" },	
			{ pattern: "src/main/js/**/*.js", included: false, served:true }
			
	],
	
	proxies: {'/volume-meter-processor.js': '/base/src/main/js/volume-meter-processor.js',
		'/draw-desktop-with-camera-source-worker.js': '/base/src/main/js/draw-desktop-with-camera-source-worker.js'
	},
    
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
    
    //logLevel: config.LOG_DEBUG
    logLevel: config.LOG_INFO,
    
    browsers: ['CustomChrome', "ChromeMobileUserAgent"],
    //browsers: ['Chrome'],
    

	customLaunchers: {
	  CustomChrome: {
	    base: 'Chrome',
	    flags: ['--headless',
	    		'--disable-gpu', 
				"--headless=new",
				"--no-sandbox",
				"--disable-dev-shm-usage",
				"--log-level=1",
				"--remote-allow-origins=*",
				"--use-fake-ui-for-media-stream",
				"--use-fake-device-for-media-stream",
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
				'--user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1"'
				]
	  },
	  
	},
	    
    autoWatch: true,
    
    singleRun: true, // Karma captures browsers, runs the tests and exits
    //singleRun: false,
    
    concurrency: Infinity,
  })
}            
