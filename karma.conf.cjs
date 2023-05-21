module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai','sinon'],
    files: [
			{ pattern: "src/test/**/*.js", type: "module" },
			{ pattern: "src/main/webapp/**/*.js", type: "module", included: false },
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
    
    browsers: ['ChromeHeadless'],
    
    autoWatch: true,
    
    singleRun: true, // Karma captures browsers, runs the tests and exits
    
    concurrency: Infinity,
  })
}            
