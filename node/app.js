/* initializations, declarations, etc... */

var fs = require('fs');
var Gpio = require('onoff').Gpio,
	button = new Gpio(22, 'in', 'both',{ persistentWatch: true, debounceTimeout: 300 }),
	buttonLed = new Gpio(23, 'out');
var lame = require('lame');
var Speaker = require('speaker');
var Lcd = require('lcd'),
  lcd = new Lcd({
    rs: 14,
    e: 2,
    data: [3, 4, 15, 18],
    cols: 16,
    rows: 2
  });
var http = require('http');
var Firebase = require('firebase');
var firebaseRef = new Firebase("https://smartalarmv2.firebaseio.com");
var alarmDataRef = firebaseRef.child("alarmdata");

/* our modules! */
var tts = require('./tts'); // my function for text to speech
var mp3 = require('./mp3'); // play mp3s
var ultrasonic = require('./ultrasonic'); // ultrasonic sensor

ultrasonic.startSensing(60); // requires superuser. syntax is startSensing(offset).
// volume control logic is (distance + offset) = % volume.

/* Some variables to hold data. */
var data; //native js version of firebase snapshot
/* Forecast data variables */
var info;
var temp;
var forecast;
var forecastDetails;
var ledInterval;

firebaseRef.on('value',function(snapshot){
	data = snapshot.val();
	console.log("Firebase data changed!");
	console.log(data);
//	tts.speak("hello world");
});

/* Update weather data every 30 minutes */
setInterval(function() {
	updateWeather();
}, 1800000);

lcd.on('ready', function() {
	updateWeather();
	lcd.clear();
	setTimeout(function() {
		printLCD();
	}, 5000);
});

/* Once per minute loop function */

setInterval(function() {
	var day = new Date();
	printLCD();

/* Sound some alarms */
	for (var alarm in data.alarmdata){ 
//		console.log(data.alarmdata[alarm]);
		if(data.alarmdata[alarm].hour == day.getHours() && data.alarmdata[alarm].minute == day.getMinutes()) {
//			tts.speak("Wake up dumb fuck");
			mp3.play("./audio/ThisLove.mp3"); // because Maroon 5
/*			setTimeout(function(){ // just for testing, for now
				snooze();
			}, 10000);
*/
			ledInterval = setInterval(function () {
				buttonLed.writeSync(buttonLed.readSync() ^ 1); // 1 = on, 0 = off :) 
			}, 200);
			
			console.log("alarm now");
			if(!data.alarmdata[alarm].isRepeating) { // if this is NOT a repeating alarm, remove it after it's been sounded
				var childRef = alarmDataRef.child(alarm);
				childRef.remove();
			}
		}
	}
}, 60000);

/* Watch button */
button.watch(function (err, value) {
	if (value == 1) {
		clearInterval(ledInterval);
		buttonLed.writeSync(0);
		snooze();
	}
});

/* Helper functions */

function printLCD(){
	var time;
	var DayNum;
	var month;
	var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var DayText;

        var currentDate = new Date();
        time = currentDate.toString().substring(16,21);
        dayNum = currentDate.toString().substring(8,10);
        month = currentDate.getMonth() + 1;

        dayText = currentDate.toString().substring(0,3);

        lcd.setCursor(0,0);
	console.log("LCD printed at: " + time + " " + dayText + " " + monthNames[month-1] + " " + dayNum);
        lcd.print(time + " " + dayText + " " + monthNames[month-1] + " " + dayNum);
        lcd.once('printed', function() {
                lcd.setCursor(0,1);
                lcd.print(forecast);
                lcd.once('printed', function() {
                        lcd.setCursor(11,1);
                        lcd.print(temp.toFixed(1) + "C");
                });

        });
}

function updateWeather(){
        http.get("http://api.openweathermap.org/data/2.5/weather?q=Vancouver,CAN&units=metric", function(res) {
        console.log("Weather updated, HTTP response code: " + res.statusCode);
        var data = '';
        res.on('data', function (chunk) {
                data += chunk;
        });
        res.on('end', function(){

                info = JSON.parse(data);
                temp = info.main.temp;
                forecast = info.weather[0].main;
		forecastDetails = info.weather[0].description;
                console.log('Temperature: ' + temp);
                console.log('Forecast: ' + forecast);

        }).on('error', function(e) {
        console.log("Got error: " + e.message);
        });
        });
}

function snooze() {
	mp3.stop();
	var currentTime = new Date();
	var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	var information = "The time is " + currentTime.getHours() + " " + currentTime.getMinutes() + " on " + currentTime.toString().substring(0,3) + ", " + months[currentTime.getMonth()] + " " + currentTime.getDate() + ". The weather is " + temp.toFixed(1) + " degrees with " + forecastDetails;
	tts.speak(information);
}