const fs = require('fs')
const path = require('path')
const moment = require('moment-timezone')
const tweetFile = path.join(__dirname,'tweets.json')
const tweetList = fs.existsSync(tweetFile) ? JSON.parse(fs.readFileSync(tweetFile,'utf-8')) : []
const CREDS = require('./creds.json')

// Twitter API Wrapper
const twitter = require('twitter');
const twitterClient = new twitter(CREDS.twitter);

// Twilio API Wrapper
const twilio = require("twilio")
const twilioClient = new twilio (CREDS.accountSid,CREDS.authToken)

async function getTweets(){
	var params = {
		q: 'queue-it OR queueit AND -from:queueit AND -filter:retweets',
		result_type: 'recent',
		since_id: tweetList.length ? tweetList[tweetList.length-1].id: undefined,
	};
	return new Promise((resolve,reject) => {
		twitterClient.get('search/tweets', params, function(err, tweets) {
			if(err){
				reject(err)
				return
			} else {
				resolve(tweets)
				return
			}
		})
	})
}

async function main(){
	// Get the tweets
	var tweets = await getTweets()

	// Grab the stuff I want out of them
	let notes = tweets.statuses.map(tweet => ({
		id: tweet.id_str,
		text: tweet.text,
		url: 'https://twitter.com/i/web/status/' + tweet.id_str,
		time: moment(new Date(tweet.created_at)).tz('America/Boise'),
		user: tweet.user.screen_name,
		image: tweet.user.profile_image_url
	}))

	// Put the most recent last
	notes.reverse()
	
	// send the notifications
	notes.forEach(note => {
		twilioClient.messages.create({
			body: `${note.time.format('MMM Do h:mm A')}: ${note.text}`,
			to: CREDS.sendTo,
			from: CREDS.sendFrom
		})
	})
	
//	 append them to my file
	tweetList.push(...notes)
	fs.writeFileSync(tweetFile,JSON.stringify(tweetList))
}

// Only run while I am awake
var nowHour = moment().tz('America/Boise').hour()
if(nowHour > 7 && nowHour < 22){
	main()
}

