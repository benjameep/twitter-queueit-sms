const fs = require('fs')
const path = require('path')
const tweetFile = path.join(__dirname,'tweets.json')
const tweetList = fs.existsSync(tweetFile) ? JSON.parse(fs.readFileSync(tweetFile,'utf-8')) : []
const CREDS = require('./creds.json')

// Twitter API Wrapper
const twitter = require('twitter');
const twitterClient = new twitter(CREDS.twitter);

// Twilio API Wrapper
const twilio = require("twilio")
const twilioClient = new twilio (CREDS.accountSid,CREDS.authToken)


function formatTime(date){
	let months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"]
	let mon = months[date.getMonth()]
	let day = date.getDate()
	let hours = date.getHours()
	let ampm = hours >= 12 ? 'pm':'am'
	hours = hours % 12 || 12
	let min = ('00'+date.getMinutes()).slice(-2)
	return `${mon} ${day}  ${hours}:${min}${ampm}`
}

var params = {
	q: 'queue-it OR queueit AND -from:queueit AND -filter:retweets',
	result_type: 'recent',
	since_id: tweetList.length ? tweetList[tweetList.length-1].id: undefined,
};

twitterClient.get('search/tweets', params, function(err, tweets, res) {
	if(err) return console.error(err)
	
//	fs.writeFileSync('temp.json',JSON.stringify(tweets))
	
	// Grab the stuff I want out of them
	let notes = tweets.statuses.map(tweet => ({
		id: tweet.id_str,
		text: tweet.text,
		url: 'https://twitter.com/i/web/status/' + tweet.id_str,
		time: new Date(tweet.created_at),
		user: tweet.user.screen_name,
		image: tweet.user.profile_image_url
	}))

	// Put the most recent last
	notes.reverse()

	// send the notifications
	notes.forEach(note => {
		twilioClient.messages.create({
			body: `${formatTime(note.time)}: ${note.text}`,
			to: CREDS.sendTo,
			from: CREDS.sendFrom
		})
	})
	
	// append them to my file
	tweetList.push(...notes)
	fs.writeFileSync(tweetFile,JSON.stringify(tweetList))
});
