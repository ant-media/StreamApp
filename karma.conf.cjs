module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
			{ pattern: "src/test/**/*.js", type: "module" },
		
			{ pattern: "src/main/webapp/js/external/video.js", included: true },
			{ pattern: "src/main/webapp/js/external/dash.all.min.js", included: true },
			{ pattern: "src/main/webapp/**/*.js", included: false },
			
	],
    
    
    reporters: ['progress', 'coverage'],

    
    preprocessors: {
    	'src/main/webapp/js/*.js': ['coverage'],
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
    
    browsers: ['CustomChrome'],
    //browsers: ['Chrome'],
    

	customLaunchers: {
	  CustomChrome: {
	    base: 'Chrome',
	    flags: ['--headless',
	    		'--disable-gpu', 
	     		"--disable-gpu", 
				"--headless=new",
				"--no-sandbox",
				"--disable-dev-shm-usage",
				"--log-level=1",
				"--remote-allow-origins=*",
				"--use-fake-ui-for-media-stream",
				"--use-fake-device-for-media-stream"]
	  }
	},
	    
    autoWatch: true,
    
    singleRun: true, // Karma captures browsers, runs the tests and exits
    //singleRun: false,
    
    concurrency: Infinity,
  })
}            
