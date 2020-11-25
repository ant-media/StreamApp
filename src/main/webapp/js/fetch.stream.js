//ask if adaptive m3u8 file

if (!String.prototype.endsWith) 
{
	String.prototype.endsWith = function(searchString, position) {
		var subjectString = this.toString();
		if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
			position = subjectString.length;
		}
		position -= searchString.length;
		var lastIndex = subjectString.lastIndexOf(searchString, position);
		return lastIndex !== -1 && lastIndex === position;
	};
}

export function tryToPlay(name, token, type, subscriberId, subscriberCode, noStreamCallback) {
	fetch("streams/"+ name +"_adaptive."+type, {method:'HEAD'})
	.then(function(response) {
		if (response.status == 200) {
			// adaptive m3u8 & mpd exists,play it
			initializePlayer(name+"_adaptive", type, token, subscriberId, subscriberCode);
		}
		else 
		{
			//adaptive not exists, try mpd or m3u8 exists.
			fetch("streams/"+ name +"."+type, {method:'HEAD'})
			.then(function(response) {
				if (response.status == 200) {
					initializePlayer(name, type, token, subscriberId, subscriberCode);
				}
				else {
					console.log("No stream found");
					if (typeof noStreamCallback != "undefined") {
							noStreamCallback();
						}
					}
			}).catch(function(err) {
				console.log("Error: " + err);
			});
		}
	}).catch(function(err) {
		console.log("Error: " + err);
	});

}

export function tryToVODPlay(name, token, subscriberId, subscriberCode, noStreamCallback, playType){

	if (typeof playType == "undefined" || playType == null || playType.length == 0) {
		console.error("playType is not defined");
		return;
	}
	var firstPlayType = playType[0];
	var secondPlayType = null;
	
	if (playType.length >= 2) 
	{
		secondPlayType = playType[1];
	}

	fetch("streams/"+ name +"."+firstPlayType, {method:'HEAD'})
		.then(function(response) {
			if (response.status == 200) {
				//firstPlayType exists, play it
				initializePlayer(name, firstPlayType, token, subscriberId, subscriberCode)
			}
			else if(secondPlayType  != null){
				fetch("streams/"+ name +"."+secondPlayType, {method:'HEAD'})
				.then(function(response) {
				if (response.status == 200) {
					//secondPlayType exists, play it
					initializePlayer(name, secondPlayType, token, subscriberId, subscriberCode)
				}
				else {
					console.log("No stream found");
					if (typeof noStreamCallback != "undefined") {
						noStreamCallback();
					}
				}
				}).catch(function(err) {
					console.log("Error: " + err);
				});
			}
			else{
				console.log("No stream found");
				if (typeof noStreamCallback != "undefined") {
					noStreamCallback();
				}
			}
		}).catch(function(err) {
			console.log("Error: " + err);
		});
}

export function isMobile() { 
	if( navigator.userAgent.match(/Android/i)
			|| navigator.userAgent.match(/webOS/i)
			|| navigator.userAgent.match(/iPhone/i)
			|| navigator.userAgent.match(/iPad/i)
			|| navigator.userAgent.match(/iPod/i)
			|| navigator.userAgent.match(/BlackBerry/i)
			|| navigator.userAgent.match(/Windows Phone/i)
	)
	{
		return true;
	}
	else {
		return false;
	}
}

export function getUrlParameter(sParam) {
	var sPageURL = decodeURIComponent(window.location.search.substring(1)),
		sURLVariables = sPageURL.split('&'),
		sParameterName,
		i;

	for (i = 0; i < sURLVariables.length; i++) {
		sParameterName = sURLVariables[i].split('=');

		if (sParameterName[0] === sParam) {
			return sParameterName[1] === undefined ? true : sParameterName[1];
		}
	}
}
