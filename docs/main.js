const KEY = 'AIzaSyCLUo5qEty6lVBgMzV4JQFQmx7ivTQcuD8';
const MAX_MAX_TIMER_VALUE = 600;
const MIN_MAX_TIMER_VALUE = 10;

let MAX_TIMER_VALUE = 60;

let playlistId; // playlist ID
let playlistData = []; // video IDs
let durationData = []; // video durations
let timerEnabled = true;
let timerValue;
let timerInterval;

let totalElementCount;
let currElementCount;

// Main function. Gets all data for video randomization, starts the roulette
async function start() {
	// hide form
	document.getElementById('form').hidden = true;

	// unhide loading text
	document.getElementById('loading-container').hidden = false;

	// get playlistID from channel URL
	playlistId = await getPlaylistId(document.getElementById('channel-url').value);

	if (playlistId == null) {
		// invalid URL was entered, revert page
		document.getElementById('form').hidden = false;
		document.getElementById('loading-container').hidden = true;
		return;
	}

	// get playlist data
	let url = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${KEY}`;
	playlistData = await getPlaylistData(url);

	// use the playlist data to get duration data for each video
	durationData = await getDurationData(playlistData);

	// hide loading text
	document.getElementById('loading-container').hidden = true;

	// unhide spin button
	document.getElementById('spin').hidden = false;
}

async function getPlaylistId(curl) {
	// extract channel id from url
	let cid = curl.split('/');
	cid = cid[cid.length - 1];

	if (cid.substring(0, 2) !== 'UC') {
		// this is not a valid channel url
		alert('Please enter a valid YouTube channel URL. Vanity and custom URLs will not work.');
		return null;
	}

	// convert channel id to playlist id
	return 'UU' + cid.substring(2, cid.length);
}

// get playlist data (video IDs), store in an array, and return it
async function getPlaylistData(url) {
	arr = [];
	response = await fetch(url);
	data = await response.json();

	// get total number of items*2 (videoIDs + durations) for progress tracking
	totalElementCount = data.pageInfo.totalResults * 2;

	// set current element count to 0
	currElementCount = 0;

	// push each page's items to array
	while (data.nextPageToken) {
		data.items.forEach((item) => {
			arr.push(item.snippet.resourceId.videoId);

			// update progress %
			updateProgress();
		});

		response = await fetch(url + '&pageToken=' + data.nextPageToken);
		data = await response.json();
	}

	// push final page's items to array
	data.items.forEach((item) => {
		arr.push(item.snippet.resourceId.videoId);

		// update progress %
		updateProgress();
	});

	return arr;
}

async function getDurationData(pdata, start = 0, end = 50) {
	let arr = [];
	let idstring;
	let url = `https://youtube.googleapis.com/youtube/v3/videos?part=contentDetails&key=${KEY}`;
	do {
		idstring = '';
		end = Math.min(start + 50, pdata.length);
		for (i = start; i < end; i++) {
			idstring += `&id=${pdata[i]}`;
		}

		let response = await fetch(url + idstring);
		let data = await response.json();
		data.items.forEach((item) => {
			let seconds = toSeconds(item.contentDetails.duration);
			arr.push(seconds);

			// update progress %
			updateProgress();
		});

		start += 50;
	} while (start < pdata.length);

	return arr;
}

function updateProgress() {
	currElementCount++;
	let percent = (currElementCount / totalElementCount) * 100;
	document.getElementById('progress').innerText = `${percent.toFixed(2)}%`;
}

function toSeconds(isotime) {
	var matches = isotime.match(/[0-9]+[YWDHMS]/g);

	var seconds = 0;

	matches.forEach(function (part) {
		var unit = part.charAt(part.length - 1);
		var amount = parseInt(part.slice(0, -1));

		switch (unit) {
			case 'Y':
				seconds += amount * 60 * 60 * 24 * 365;
				break;
			case 'W':
				seconds += amount * 60 * 60 * 24 * 7;
				break;
			case 'D':
				seconds += amount * 60 * 60 * 24;
				break;
			case 'H':
				seconds += amount * 60 * 60;
				break;
			case 'M':
				seconds += amount * 60;
				break;
			case 'S':
				seconds += amount;
				break;
			default:
			// noop
		}
	});

	return seconds;
}

function spin() {
	// hide spin button and instructions
	document.getElementById('spin').hidden = true;
	document.getElementById('instructions').hidden = true;

	// unhide iframe and controls
	document.getElementById('video').hidden = false;
	document.getElementById('controls-container').hidden = false;

	// load video
	nextVideo();
}

function nextVideo() {
	// pick a random video from the playlist
	let i = Math.floor(Math.random() * playlistData.length - 1);
	console.log(`${playlistData[i]}, ${durationData[i]}`);

	// pick a random timestamp
	let tsMax = durationData[i] - MAX_TIMER_VALUE;
	let ts =
		tsMax >= 0 ? Math.floor(Math.random() * tsMax) : Math.floor(Math.random() * durationData[i]);
	console.log(ts);

	// load the video
	url = `https://www.youtube.com/embed/${playlistData[i]}?start=${ts}&autoplay=1`;
	document.getElementById('video').setAttribute('src', url);

	startTimer();
}

function startTimer() {
	changeMaxTime(0);
	clearInterval(timerInterval);
	timerValue = MAX_TIMER_VALUE;
	document.getElementById('timer').innerText = timerValue;

	if (timerEnabled == false) {
		toggleTimer();
	}
	timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
	if (timerEnabled) {
		timerValue--;
		if (timerValue <= 0) {
			// we have reached the end of the time for this video, get the next one
			nextVideo();
		} else {
			document.getElementById('timer').innerText = timerValue;
		}
	}
}

function toggleTimer() {
	if (timerEnabled) {
		// disable timer and change text to 'ENABLE TIMER'
		document.getElementById('toggletimer').innerText = 'RESUME TIMER';
		timerEnabled = false;
	} else {
		// enable timer and change text to 'DISABLE TIMER'
		document.getElementById('toggletimer').innerText = 'PAUSE TIMER';
		timerEnabled = true;
	}
}

function changeMaxTime(num) {
	// update max timer value (respecting min of 10 and max of 600)
	MAX_TIMER_VALUE = Math.max(
		Math.min(MAX_TIMER_VALUE + num, MAX_MAX_TIMER_VALUE),
		MIN_MAX_TIMER_VALUE
	);

	// update DOM
	document.getElementById('maxtime-value').innerText = MAX_TIMER_VALUE;
}
