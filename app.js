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
app.get('/Topnews/commands', function (req, res) {
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
app.get('/Topnews/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === '12345') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})
app.get('/Airlinedemo/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === '12345') {
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
})

// Facebook Token
const tokens = {
	"Topnews":"EAAaXcVlyIQ4BAH6MaDL9B1ZBts6Q3kcvMyEAIj2K4WfQYuAeQAait0NxtOEsWxoNndkMtSNISZBTR1ZCF6ozYSpk4KHMnQbhHIxm1d0FvykQtLpsUzvLM1XCLGs9cZCoksmStOpZBl9277zTDd8QEgUTM9ZANCemEpFbVt7dVG4wZDZD",
	"Airlinedemo":"EAAaXcVlyIQ4BAFLQ7sJHv2SD2ACUnC6e4dHZAdJZC4aemhurNSZAYZBmoGycbknJBGdThhKS2NsdzW5FEbZATzLlsQsW7UPlKWIU9tuXyMWyp33LZAtlkKWIZBqvYWiRnsWBgZCuNaUK2gBo0d2l4e0n5cPme6OSYyo1zm2RebroAwZDZD"
}
// News API
const newsAPI = "https://newsapi.org/v1/";
const apiKey = "a765db54daed43edabc8b7c82a1216df";

// Chosen Category
let chosenCategory = ""

// Webhook
app.post('/Topnews/webhook/', function (req, res) {
	let token = tokens.Topnews
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
app.post('/Airlinedemo/webhook/', function (req, res) {
	let token = tokens.Airlinedemo
	let messaging_events = req.body.entry[0].messaging
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		let sender = event.sender.id
		if (event.message && event.message.text) {
			let text = event.message.text.toLowerCase()
			if (text == "itinerary") {
				sendItineraryMessage(sender, token)
			} else if (text === "checkin reminder") {
				sendCheckinReminderMessage(sender, token)
			} else if (text === "boarding pass") {
				sendBoardingPassMessage(sender, token)
			} else if (text === "flight update") {
				sendFlightUpdateMessage(sender, token)
			} else if (text === "get templates") {
				sendTemplateMessage(sender, token)
			} else {
				sendTemplateMessage(sender, token)
			}
		} else if (event.postback && event.postback.payload) {
			let text = event.postback.payload

		}
	}
	res.sendStatus(200)
})

// First Time User
getStarted()
function getStarted() {
	let token = tokens.Topnews
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
	let text = "Welcome to Top News"
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
	let url = "https://afternoon-savannah-53641.herokuapp.com/Topnews/commands";
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

// Send Itinerary Message
function sendItineraryMessage(sender, token) {
	let intro_message = "Here's your flight itinerary."
	let message = {
		"attachment": {
			"type": "template",
			"payload": {
			"template_type": "airline_itinerary",
			"intro_message": intro_message,
			"locale": "en_US",
			"pnr_number": "ABCDEF",
			"passenger_info": [{
				"name": "Farbound Smith Jr",
				"ticket_number": "0741234567890",
				"passenger_id": "p001"
			}, {
				"name": "Nick Jones",
				"ticket_number": "0741234567891",
				"passenger_id": "p002"
			}],
			"flight_info": [{
				"connection_id": "c001",
				"segment_id": "s001",
				"flight_number": "KL9123",
				"aircraft_type": "Boeing 737",
				"departure_airport": {
					"airport_code": "SFO",
					"city": "San Francisco",
					"terminal": "T4",
					"gate": "G8"
				},
				"arrival_airport": {
					"airport_code": "SLC",
					"city": "Salt Lake City",
					"terminal": "T4",
					"gate": "G8"
				},
				"flight_schedule": {
					"departure_time": "2016-01-02T19:45",
					"arrival_time": "2016-01-02T21:20"
				},
				"travel_class": "business"
			}, {
				"connection_id": "c002",
				"segment_id": "s002",
				"flight_number": "KL321",
				"aircraft_type": "Boeing 747-200",
				"travel_class": "business",
				"departure_airport": {
					"airport_code": "SLC",
					"city": "Salt Lake City",
					"terminal": "T1",
					"gate": "G33"
				},
				"arrival_airport": {
					"airport_code": "AMS",
					"city": "Amsterdam",
					"terminal": "T1",
					"gate": "G33"
				},
				"flight_schedule": {
					"departure_time": "2016-01-02T22:45",
					"arrival_time": "2016-01-03T17:20"
				}
			}],
			"passenger_segment_info": [{
					"segment_id": "s001",
					"passenger_id": "p001",
					"seat": "12A",
					"seat_type": "Business"
				}, {
					"segment_id": "s001",
					"passenger_id": "p002",
					"seat": "12B",
					"seat_type": "Business"
				}, {
					"segment_id": "s002",
					"passenger_id": "p001",
					"seat": "73A",
					"seat_type": "World Business",
					"product_info": [{
						"title": "Lounge",
						"value": "Complimentary lounge access"
					}, {
						"title": "Baggage",
						"value": "1 extra bag 50lbs"
					}]
				}, {
					"segment_id": "s002",
					"passenger_id": "p002",
					"seat": "73B",
					"seat_type": "World Business",
					"product_info": [{
						"title": "Lounge",
						"value": "Complimentary lounge access"
					}, {
						"title": "Baggage",
						"value": "1 extra bag 50lbs"
					}]
				}],
    		    "price_info": [{
					"title": "Fuel surcharge",
					"amount": "1597",
					"currency": "USD"
				}],
				"base_price": "12206",
				"tax": "200",
				"total_price": "14003",
				"currency": "USD"
			}
		}
	}
	sendMessage(sender, message, token)
}

// Send Checkin Reminder Message
function sendCheckinReminderMessage(sender, token) {
	let intro_message = "Check-in is available now."
	let message = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "airline_checkin",
				"intro_message": intro_message,
				"locale": "en_US",
				"pnr_number": "ABCDEF",
				"flight_info": [{
					"flight_number": "f001",
					"departure_airport": {
						"airport_code": "SFO",
						"city": "San Francisco",
						"terminal": "T4",
						"gate": "G8"
					},
					"arrival_airport": {
						"airport_code": "SEA",
						"city": "Seattle",
						"terminal": "T4",
						"gate": "G8"
					},
					"flight_schedule": {
						"boarding_time": "2016-01-05T15:05",
						"departure_time": "2016-01-05T15:45",
						"arrival_time": "2016-01-05T17:30"
					}
				}],
				"checkin_url": "https://afternoon-savannah-53641.herokuapp.com/Airlinedemo/checkin.html"
			}
		}
	}
	sendMessage(sender, message, token)
}

// Send Boarding Pass Message
function sendBoardingPassMessage(sender, token) {
	let intro_message = "You are checked in."
	var root_url = "https://afternoon-savannah-53641.herokuapp.com/Airlinedemo/img/"
	let logo_image_url = root_url + "logo.png"
	let header_image_url = root_url + "header.png"
	let above_bar_code_image_url = root_url + "bar_code.png"
	let message = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "airline_boardingpass",
				"intro_message": intro_message,
				"locale": "en_US",
				"boarding_pass": [{
					"passenger_name": "SMITH NICOLAS",
					"pnr_number": "CG4X7U",
					"travel_class": "business",
					"seat": "74J",
					"auxiliary_fields": [{
						"label": "Terminal",
						"value": "T1"
					}, {
						"label": "Departure",
						"value": "30OCT 19:05"
					}],
					"secondary_fields": [{
						"label": "Boarding",
						"value": "18:30"
					}, {
						"label": "Gate",
						"value": "D57"
					}, {
						"label": "Seat",
						"value": "74J"
					}, {
						"label": "Sec.Nr.",
						"value": "003"
					}],
					"logo_image_url": logo_image_url,
					"header_image_url": header_image_url,
					"qr_code": "M1SMITH NICOLAS  CG4X7U nawouehgawgnapwi3jfa0wfh",
					"above_bar_code_image_url": above_bar_code_image_url,
					"flight_info": {
						"flight_number": "KL0642",
						"departure_airport": {
							"airport_code": "JFK",
							"city": "New York",
							"terminal": "T1",
							"gate": "D57"
						},
						"arrival_airport": {
							"airport_code": "AMS",
							"city": "Amsterdam"
						},
						"flight_schedule": {
							"departure_time": "2016-01-02T19:05",
							"arrival_time": "2016-01-05T17:30"
						}
					}
				}, {
					"passenger_name": "JONES FARBOUND",
					"pnr_number": "CG4X7U",
					"travel_class": "business",
					"seat": "74K",
					"auxiliary_fields": [{
						"label": "Terminal",
						"value": "T1"
					}, {
						"label": "Departure",
						"value": "30OCT 19:05"
					}],
					"secondary_fields": [{
						"label": "Boarding",
						"value": "18:30"
					}, {
						"label": "Gate",
						"value": "D57"
					}, {
						"label": "Seat",
						"value": "74K"
					}, {
						"label": "Sec.Nr.",
						"value": "004"
					}],
					"logo_image_url": logo_image_url,
					"header_image_url": header_image_url,
					"qr_code": "M1SMITH NICOLAS  CG4X7U nawouehgawgnapwi3jfa0wfh",
					"above_bar_code_image_url": above_bar_code_image_url,
					"flight_info": {
						"flight_number": "KL0642",
						"departure_airport": {
							"airport_code": "JFK",
							"city": "New York",
							"terminal": "T1",
							"gate": "D57"
						},
						"arrival_airport": {
							"airport_code": "AMS",
							"city": "Amsterdam"
						},
						"flight_schedule": {
							"departure_time": "2016-01-02T19:05",
							"arrival_time": "2016-01-05T17:30"
						}
					}
				}]
			}
		}
	}
	sendMessage(sender, message, token)
}

// Send Flight Update Message
function sendFlightUpdateMessage(sender, token) {
	let intro_message = "Your flight is delayed"
	let message = {
		"attachment": {
			"type": "template",
      		"payload": {
      			"template_type": "airline_update",
        		"intro_message": intro_message,
				"update_type": "delay",
				"locale": "en_US",
				"pnr_number": "CF23G2",
				"update_flight_info": {
					"flight_number": "KL123",
					"departure_airport": {
						"airport_code": "SFO",
						"city": "San Francisco",
						"terminal": "T4",
						"gate": "G8"
					},
					"arrival_airport": {
						"airport_code": "AMS",
						"city": "Amsterdam",
						"terminal": "T4",
						"gate": "G8"
					},
					"flight_schedule": {
						"boarding_time": "2015-12-26T10:30",
						"departure_time": "2015-12-26T11:30",
						"arrival_time": "2015-12-27T07:30"
					}
				}
			}
		}
	}
	sendMessage(sender, message, token)
}

// Send Error Message
function sendTemplateMessage(sender, token) {
	let templates = ["Itinerary","Checkin Reminder","Boarding Pass","Flight Update"]
	let numberOfTemplates = templates.length
	let i = 0
	let quick_replies = []
	for (i; i < numberOfTemplates; i++) {
		let template = templates[i]
		quick_replies.push({
			"content_type":"text",
			"title":template,
			"payload":template
		})
	}
	let text = "Pick a template:"
	let message = {
		"text": text,
		"quick_replies": quick_replies
	}
	sendMessage(sender, message, token)
}

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})
