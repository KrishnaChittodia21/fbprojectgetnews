'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const Client = require('node-rest-client').Client;
const app = express()
const client = new Client();



app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json())

// Index route
app.get('', function(req, res){
	res.sendfile('./public/index.html');
})

// Available Commands
app.get('/GetNews/commands', function (req, res) {
	let commands = ["category","business","entertainment","general-au","general-gb","general-us","gaming","music","science-and-nature","sport","technology"]
	let url = "https://newsapi.org/v1/sources?language=en";
	client.get(url, function (data, response) {
		let sources = data.sources
		let numberOfSources = sources.length
		let i = 0
		for (i; i < numberOfSources; i++) {
			let id = sources[i].id
			commands.push(id);
		}
		res.send(commands)
	})
})

// for Facebook verification
app.get('/GetNews/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === '12345') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Facebook Token
const tokens = {
	"GetNews":"EAAaXcVlyIQ4BAPzfYN1gqEZBf37Jaqiq29ftXEZCvR2bg7e0aPveFA55DudrKwAsixtVE3Iq5vvAZA4VaB46kWqyx9seo5tkQRpnyVW636tB2bK1d5X3ms1X2ab8LovmMFgnO3xKVnXGMZCIdw2BHA8fZAk3wChZBu8pcRCZAWSjwZDZD",

}
// News API
const newsAPI = "";
const apiKey = "";

// Chosen Category
let chosenCategory = ""

// Webhook
app.post('/GetNews/webhook/', function (req, res) {
	let token = tokens.GetNews
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text.toLowerCase()
           	if (text === "get started" || text === "hello" || text === "hi" || text === "news") {
				sendWelcomeMessage(sender, token)
        		continue
			} else if (text === "category" || text === "help" || text === "get other categories") {
               	getCategories(sender, token)
   	            continue
       	    } else if (text === "business" || text === "entertainment" || text === "gaming" || text === "game" || text === "general-au" || text === "general-gb" || text === "general-us" || text === "music" || text === "science-and-nature" || text === "science" || text === "nature" || text === "sport" || text === "technology" || text === "tech") {
       	    	// remove text === "general" condition
           		let category = ""
           		if (text === "science" || text === "nature") {
           			category = "science-and-nature"
           		} else if (text === "game") {
           			category = "gaming"
           		} else if (text === "tech") {
           			category = "technology"
           		} else {
           			category = text
           		}
           		chosenCategory = category
				getArticlesFromRandomSource(sender, category, token)
				continue
			} else if (text === "get other sources") {
				getSources(sender, chosenCategory, token)
				continue
			} else {
				let source = text
				getArticles(sender, source, token)
				continue
			}
        } else if (event.postback && event.postback.payload) {
        	let text = event.postback.payload
        	if (text === "category" || text === "help") {
	            getCategories(sender, token)
    	        continue
        	} else if (text === "GET_STARTED") {
        		sendWelcomeMessage(sender, token)
        		continue
        	} else if (text === "#business" || text === "#entertainment" || text === "#gaming" || text === "#general-au" || text === "#general-gb" || text === "#general-us" || text === "#music" || text === "#science-and-nature" || text === "#sport" || text === "#technology") {
        		let category = text.replace("#","")
        		getSources(sender, category, token)
        		continue
        	} else {
				let source = text
				getArticles(sender, source, token)
				continue
			}
        }
    }
    res.sendStatus(200)
})

// First Time User
getStarted()
function getStarted() {
	let token = tokens.GetNews
	request.post({
		method: 'POST',
		uri: 'https://graph.facebook.com/v2.8/me/thread_settings?access_token=' + token,
		qs: {
			setting_type: 'call_to_actions',
			thread_state: 'new_thread',
			call_to_actions: [{
                payload: 'GET_STARTED'
            }]
        },
		json: true
	}, (err, res, body) => {
		console.log(err)
	});
}

// Send Message
function sendMessage(sender, message, token) {
	request({
        url: 'https://graph.facebook.com/v2.8/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: { id:sender },
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

// Send Welcome Message
function sendWelcomeMessage(sender, token) {
	let text = "Welcome to GetNews "
	let message = {
		"attachment": {
			"type":"template",
			"payload":{
				"template_type":"button",
				"text":text,
				"buttons":[{
					"type":"postback",
					"title":"LET'S BEGIN",
					"payload":"category"
				}]
			}
		}
	}
	sendMessage(sender, message, token)
}

// Get Categories
function getCategories(sender, token) {
	let categories = ["business","entertainment","gaming","general-au","general-gb","general-us","music","science-and-nature","sport","technology"]
	let numberOfCategories = categories.length
	let i = 0
	let text = "Available categories:\r\n"
	let quick_replies = []
	for (i; i < numberOfCategories; i++) {
		let category = categories[i]
		text += "- " + category + "\r\n"
		quick_replies.push({
			"content_type":"text",
			"title":category,
			"payload":category
		})
	}
	let message = {
		"text":text,
		"quick_replies":quick_replies
	}
	sendMessage(sender, message, token)
}

// Get Articles from Random Source
function getArticlesFromRandomSource(sender, category, token) {
	let source_url = newsAPI + "sources?language=en&";
	if (category === "general-au") {
		source_url += "category=general&country=au";
	} else if (category === "general-gb") {
		source_url += "category=general&country=gb";
	} else if (category === "general-us") {
		source_url += "category=general&country=us";
	} else {
		source_url += "category=" + category
	}
	client.get(source_url, function (data, response) {
		let sources = data.sources
		if (typeof sources != "undefined") {
			let numberOfSources = sources.length
			let random = Math.floor(Math.random() * numberOfSources)
			let i = 0
			let source = sources[random].id;
			let article_url = newsAPI + "articles?apiKey=" + apiKey + "&source=" + source + "&sortBy=top";
			client.get(article_url, function (data, response) {
				let status = data.status.toLowerCase();
				if (status === "ok") {
					if (typeof data.articles !== "undefined") {
						sendMessage(sender, { text:"Top news from " + source }, token)
						let articles = data.articles;
						let numberOfArticles = articles.length;
						let i = 0;
						let elements = [];
						for (i; i < numberOfArticles; i++) {
							let article = articles[i];
							let url = article.url;
							let img_url = article.urlToImage;
							let title = article.title;
							let description = article.description;
							let publishedAt = article.publishedAt;
							elements.push({
								"title": title,
								"subtitle": description,
								"item_url": url,
								"image_url": img_url,
								"buttons": [{
									"type":"element_share"
								}, {
									"type":"postback",
									"title":"Get Other Sources",
									"payload":"#" + category
								}, {
									"type":"postback",
									"title":"Get Other Categories",
									"payload":"category"
								}]
							})
						}
						let message = {
	        				"attachment": {
	    		    	    	"type": "template",
	    		    	    	"payload": {
		        	    	    	"template_type": "generic",
	    	        	    		"elements": elements
    	    	    			}
			    		    }
    					}
	    				sendMessage(sender, message, token)
					} else {
						sendErrorMessage(sender, source, token)
					}
				} else if (status === "error") {
					let text = data.message
					let message = {
						"attachment": {
							"type":"template",
							"payload":{
							"template_type":"button",
							"text":text,
								"buttons":[{
									"type":"postback",
									"title":"Get Other Categories",
									"payload":"category"
								}]
							}
						}
					}
					sendMessage(sender, message, token)
				}
		    }).on('error', function (err) {
				sendErrorMessage(sender, token)
				console.log('Something went wrong on the request\r\nPlease try again later', err.request.options);
			});
		} else {
			let message = { text:"Something went wrong on the request\r\nPlease try again later" }
			sendMessage(sender, message, token)
		}
	}).on('error', function (err) {
		sendErrorMessage(sender, token)
		console.log('Something went wrong on the request', err.request.options);
	});
}

// Get Sources
function getSources(sender, category, token) {
	let url = newsAPI + "sources?language=en&";
	if (category === "general-au") {
		url += "category=general&country=au";
	} else if (category === "general-gb") {
		url += "category=general&country=gb";
	} else if (category === "general-us") {
		url += "category=general&country=us";
	} else {
		url += "category=" + category;
	}
	client.get(url, function (data, response) {
		let sources = data.sources
		if (typeof sources != "undefined") {
			let numberOfSources = sources.length
			let i = 0
			let text = "Available sources for " + category + ":\r\n"
			let quick_replies = []
			for (i; i < numberOfSources; i++) {
				let source = sources[i].id;
				text += "- " + source + "\r\n"
				if (i < 10) {
					quick_replies.push({
						"content_type":"text",
						"title":source,
						"payload":source
					})
				}
			}
			let message = {
				"text":text,
				"quick_replies":quick_replies
			}
			sendMessage(sender, message, token)
		} else {
			let message = { text:"Something went wrong on the request\r\nPlease try again later" }
			sendMessage(sender, message, token)
		}
	})
}

// Get Article
function getArticles(sender, source, token) {
	let url = newsAPI + "articles?apiKey=" + apiKey + "&source=" + source;
	client.get(url, function (data, response) {
		if (typeof data.status != "undefined") {
			let status = data.status.toLowerCase()
			if (status === "ok") {
				if (typeof data.articles !== "undefined") {
					sendMessage(sender, { text:"Top news from " + source }, token)
					let articles = data.articles;
					let numberOfArticles = articles.length;
					let i = 0;
					let elements = [];
					for (i; i < numberOfArticles; i++) {
						let article = articles[i];
						let url = article.url;
						let img_url = article.urlToImage;
						let title = article.title;
						let description = article.description;
						let publishedAt = article.publishedAt;
						elements.push({
							"title": title,
							"subtitle": description,
							"item_url": url,
							"image_url": img_url,
							"buttons": [{
								"type":"element_share"
							}, {
								"type":"postback",
								"title":"Get Other Sources",
								"payload":"#" + chosenCategory
							}, {
								"type":"postback",
								"title":"Get Other Categories",
								"payload":"category"
								}]
						})
					}
					let message = {
	        			"attachment": {
	    	        		"type": "template",
	    	    	    	"payload": {
    	    	    	 	   "template_type": "generic",
        	    	    		"elements": elements
	            			}
			        	}
	    			}
    				sendMessage(sender, message, token)
				} else {
					sendErrorMessage(sender, source, token)
				}
			} else if (status === "error") {
				let text = data.message
				let message = {
					"attachment": {
						"type":"template",
						"payload":{
						"template_type":"button",
						"text":text,
							"buttons":[{
								"type":"postback",
								"title":"Get Other Categories",
								"payload":"category"
							}]
						}
					}
				}
				sendMessage(sender, message, token)
			}
		} else {
			let message = { text:"Something went wrong on the request\r\nPlease try again later" }
			sendMessage(sender, message, token)
		}

    }).on('error', function (err) {
		sendErrorMessage(sender, token)
		console.log('Something went wrong on the request', err.request.options);
	});
}

// Send Error Message
function sendErrorMessage(sender, source, token) {
	let url = "https://afternoon-savannah-53641.herokuapp.com/GetNews/commands";
	client.get(url, function (data, response) {
		let commands = data
		let numberOfCommands = commands.length
		let i = 0
		let suggestion = []
		for (i; i < numberOfCommands; i++) {
			let command = commands[i];
			if (command.indexOf(source) != -1) {
				suggestion.push(command)
			}
		}
		let numberOfSuggestion = suggestion.length
		let text = ""
		let message = {}
		if (numberOfSuggestion != 0) {
			let j = 0
			text = "Do you mean ?\r\n"
			let quick_replies = []
			for (j; j < numberOfSuggestion; j++) {
				let s = suggestion[j];
				text += "- " + s + "\r\n"
				if (j < 10) {
					quick_replies.push({
						"content_type":"text",
						"title":s,
						"payload":s
					})
				}
			}
			message = {
				"text":text,
				"quick_replies":quick_replies
			}
		} else {
			text = "I can't understand '" + source + "' at the moment\r\nLet's start again"
			message = {
				"attachment": {
					"type":"template",
					"payload":{
						"template_type":"button",
						"text":text,
						"buttons":[{
							"type":"postback",
							"title":"category",
							"payload":"category"
						}]
					}
				}
			}
		}
		sendMessage(sender, message, token)
	})
}




// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})
