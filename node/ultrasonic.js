var sys = require('sys');
var exec = require('child_process').exec;
var usonic = require('r-pi-usonic');
var sensor = usonic.createSensor(27, 17, 450);
var interval;

exports.startSensing = function(offset){
interval = setInterval(function() {
	var distance = Math.round(sensor());
	var volume = "amixer cset numid=1 " + (distance + offset) + "%";
//	console.log(volume);
	if (distance < 500) {
		exec(volume, puts);
	}
}, 200);
};

function puts(error, stdout, stderr) {  
//	console.log(stdout);
};

/*exports.stopSensing = function() {
	clearInterval(interval);
}*/

/*exports.setVolume = function(volume) {
	 var command = "amixer cset numid=1 " + (distance + offset) + "%";
}*/
