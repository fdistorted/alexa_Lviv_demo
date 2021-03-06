'use strict';
var APP_ID = "amzn1.ask.skill.2bddeb66-c52b-485d-aa26-a4e821a65e63"; // TODO replace with your app ID (OPTIONAL).
var accessToken;

const Alexa = require('alexa-sdk');
var request = require('request');
var Speech = require('ssml-builder');

var speechOutput;
var reprompt;

var confirmPhrases = [
    "I am done",
    "Done",
    "Finished",
    "<say-as interpret-as=\"interjection\">bingo</say-as>",
    "<say-as interpret-as=\"interjection\">bingo</say-as>"
];

var welcomePhrases = [
    "Lets drink something!",
    "How can i help you?",
    "Hi, What can I do for you?"
];

var recipePhrases = [
    "to make it you need:",
    "the instruction is:",
    "the recipe is:"
];

var ingredientsPhrases = [
    "the ingredients are:"
];

var notFoundPhrases = [
    "i cand find any cocktail with this name",
    "sorry but i cant find any cocktails",
    "no such cocktails on the list",
    "<say-as interpret-as=\"interjection\">oh boy</say-as>; i cant find cocktail"
];

var whichonePhrases = [
    "which one do you want to make?",
    "which one would you like?",
    "which one did you choose?"
];

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        var speechOutput = randomPhrase(welcomePhrases);
        this.emit(':ask', speechOutput);
    },
    'GetByName': function () {
        //SELECT id,CreatedDate FROM Lead WHERE Status='' ORDER BY CreatedDate DESC
        var self = this;

        var Name = isSlotValid(this.event.request, "Name");

        if (self.event.request.intent.slots != undefined) {
            console.log("slots: " + JSON.stringify(self.event.request.intent.slots));
        }
        var speechOutput = ""
        getListOfCoctailsByName(Name, function (records) {
            processCocktails(self, records, function (speechOutput, imageObj, cardTitle, cardContent, isTell) {
                console.log("speechOutput is:" + speechOutput);
                if (imageObj != null && cardTitle != null && cardContent != null) {
                    console.log("tell with card")
                    self.emit(':tellWithCard', speechOutput, cardTitle, cardContent, imageObj);
                } else {
                    if (isTell) {
                        console.log("tell without card")
                        self.emit(':tell', speechOutput);
                    } else {
                        console.log("ask without card")
                        self.emit(':ask', speechOutput);
                    }
                }
            })
        });
        console.log("speechOutput: " + speechOutput);


    }, 'GetByIngredient': function () {
        //SELECT id,CreatedDate FROM Lead WHERE Status='' ORDER BY CreatedDate DESC
        var self = this;

        var Name = isSlotValid(this.event.request, "Ingredient");

        if (self.event.request.intent.slots != undefined) {
            console.log("slots: " + JSON.stringify(self.event.request.intent.slots));
        }
        var speechOutput = ""
        getListOfCoctailsIngredient(Name, function (records) {
            processCocktails(self, records, function (speechOutput, imageObj, cardTitle, cardContent, isTell) {
                console.log("speechOutput is:" + speechOutput);
                if (imageObj != null && cardTitle != null && cardContent != null) {
                    self.emit(':tellWithCard', speechOutput, cardTitle, cardContent, imageObj);
                } else {
                    if (isTell) {
                        console.log("tell with card")
                        self.emit(':tell', speechOutput);
                    } else {
                        self.emit(':ask', speechOutput);
                    }
                }
            })
        });
    }, 'GetRandom': function () {
        //SELECT id,CreatedDate FROM Lead WHERE Status='' ORDER BY CreatedDate DESC
        var self = this;
        var speechOutput = "";
        if (self.event.request.intent.slots != undefined) {
            console.log("slots: " + JSON.stringify(self.event.request.intent.slots));
        }
        getListOfCoctailRandom(function (records) {
            processCocktails(self, records, function (speechOutput, imageObj, cardTitle, cardContent, isTell) {
                console.log(speechOutput);
                if (imageObj != null && cardTitle != null && cardContent != null) {
                    self.emit(':tellWithCard', speechOutput, cardTitle, cardContent, imageObj);
                } else {
                    if (isTell) {
                        self.emit(':tell', speechOutput);
                    } else {
                        self.emit(':ask', speechOutput);
                    }
                }
            })
        });
    }, 'GetByNumber': function () {
        //SELECT id,CreatedDate FROM Lead WHERE Status='' ORDER BY CreatedDate DESC
        var self = this;
        var speechOutput = "";

        var Number = isSlotValid(this.event.request, "Number");

        if (self.attributes.cocktails && Number) {
            // console.log(self.attributes.cocktails)
            console.log("slots: " + JSON.stringify(self.event.request.intent.slots));
            if (self.attributes.cocktails.length > 0) {
                if (Number < 1 || Number > self.attributes.cocktails.length) {
                    self.emit(':ask', "Hm, there is only " + self.attributes.cocktails.length + "coctails; Please tell the right number.");
                }
                var cocktail = self.attributes.cocktails[Number - 1];
                var imageObj;
                if (cocktail.strDrinkThumb) {
                    imageObj = {
                        smallImageUrl: cocktail.strDrinkThumb.replace("http:", "https:"),
                        largeImageUrl: cocktail.strDrinkThumb.replace("http:", "https:"),
                    };
                    var cardTitle = cocktail.strDrink;
                    var cardContent = cocktail.strInstructions;
                }
                var ingredients = [];
                var j = 1;
                while (cocktail["strIngredient" + j] != "" && j < 16) {
                    var ingredient = {
                        name: cocktail["strIngredient" + j],
                        measure: cocktail["strMeasure" + j]
                    }
                    ingredients.push(ingredient);
                    j++;
                }

                var ingredientsStr = "";
                ingredients.forEach(function (item, i, arr) {
                    if (item.measure != "") {
                        ingredientsStr += item.name + ": " + item.measure + ";";
                    } else {
                        ingredientsStr += item.name + ";";
                    }
                })

                console.log("cocktail by number")

                var speech = new Speech();
                speech.say(cocktail.strDrink);
                speech.pause('300ms');
                speech.say(randomPhrase(ingredientsPhrases) + ingredientsStr);
                speech.pause('500ms');
                speech.say(randomPhrase(recipePhrases) + cocktail.strInstructions);
                speechOutput = speech.ssml(true);
                if (imageObj && cardTitle && cardContent) {
                    self.emit(':tellWithCard', speechOutput, cardTitle, cardContent, imageObj);
                } else {
                    self.emit(':tell', speechOutput);
                }

            } else {
                console.log("coctails length is zero")
                self.emit(':tell', "What does this number mean?");
            }
        } else {
            console.log("coctails is null")
            self.emit(':tell', "What does this number mean?");
        }
    },
    'AMAZON.NoIntent': function () {
        this.emit(':tell', 'Ok, see you next time!');
    },
    'AMAZON.HelpIntent': function () {
        var speech = new Speech();
        speech.say("To use this skill you need to ask My Barmen to find the coctail you want");
        speech.pause('300ms');
        speech.say("Something like: ask My barmen to find margarita");
        speech.pause('300ms');
        speech.say("There is can be more than one cocktail named margarita, so My barmen will list the first few options and will ask you to choose one");
        speech.pause('300ms');
        speech.say("You can say a number of cocktail you want, and My barmen will help you with a recipe");
        speech.pause('300ms');
        speech.say("Also, you can find a cocktail with the ingredient you want, or a random cocktail. You can say: ask My barmen to find a wine-based cocktail or   ask My barmen to find a random cocktail");
        speech.pause('300ms');
        speech.say('Now you know how to use this skill. How can I help you?');
        var speechOutput = speech.ssml(true);
        this.emit(':ask', speechOutput);
    },
    'AMAZON.CancelIntent': function () {
        speechOutput = "";
        this.emit(':tell', speechOutput);
    },
    'AMAZON.StopIntent': function () {
        speechOutput = "";
        this.emit(':tell', speechOutput);
    },
    'SessionEndedRequest': function () {
        var speechOutput = "";
        this.emit(':tell', speechOutput);
    }, 'Unhandled': function () {
        var speechOutput = "this intent is unhandled";
        this.emit(':tell', speechOutput)
    }
};

function processCocktails(self, cocktails, callback) {
    if (cocktails != null) {
        if (cocktails.length > 0) {
            self.attributes.cocktails = cocktails;
        }
        var count = cocktails.length;
        var speechOutput = ""
        if (count == 1) {
            if (cocktails[0].strDrinkThumb != null) {
                var imageObj = {
                    smallImageUrl: cocktails[0].strDrinkThumb.replace("http:", "https:"),
                    largeImageUrl: cocktails[0].strDrinkThumb.replace("http:", "https:"),
                };
                var cardTitle = cocktails[0].strDrink;
                var cardContent = cocktails[0].strInstructions;
            }
            var ingredients = [];
            var j = 1;
            while (cocktails[0]["strIngredient" + j] != "" && j < 16) {
                var ingredient = {
                    name: cocktails[0]["strIngredient" + j],
                    measure: cocktails[0]["strMeasure" + j]
                }
                ingredients.push(ingredient);
                j++;
            }

            var ingredientsStr = "";
            ingredients.forEach(function (item, i, arr) {
                if (item.measure != "") {
                    ingredientsStr += item.name + ": " + item.measure + ";";
                } else {
                    ingredientsStr += item.name + ";";
                }
            })

            console.log("found 1")
            var speech = new Speech();
            speech.say('i found ' + cocktails[0].strDrink);
            speech.pause('300ms');
            speech.say(randomPhrase(ingredientsPhrases) + ingredientsStr);
            speech.pause('500ms');
            speech.say(randomPhrase(recipePhrases) + cocktails[0].strInstructions);
            speechOutput = speech.ssml(true);
            callback(speechOutput, imageObj, cardTitle, cardContent, true)
        } else if (count == 2) {
            console.log("found 2")
            var speech = new Speech();
            speech.say("i found 2 coctails; The " + cocktails[0].strDrink + " and " + cocktails[1].strDrink);
            speech.pause('300ms');
            speech.say(randomPhrase(whichonePhrases));
            speechOutput = speech.ssml(true);
            callback(speechOutput, null, null, null, false)
        } else if (count >= 3) {
            console.log("found 3")
            var speech = new Speech();
            speech.say("i found " + count + " coctails");
            speech.pause('300ms');
            speech.say("The first 3 is the " + cocktails[0].strDrink + ", " + cocktails[1].strDrink + ", " + cocktails[2].strDrink);
            speech.pause('500ms');
            speech.say(randomPhrase(whichonePhrases));
            speechOutput = speech.ssml(true);
            callback(speechOutput, null, null, null, false)
        } else if (count == 0) {
            console.log("not found")
            speechOutput = randomPhrase(notFoundPhrases)+"; please ask again";
            callback(speechOutput, null, null, null, false)
        }
    } else {
        console.log("not found")
        speechOutput = randomPhrase(notFoundPhrases)+"; please ask again";
        callback(speechOutput, null, null, null, false)
    }
}

function getListOfCoctailsByName(name, callback) {
    var result;
    console.log("request: " + 'http://www.thecocktaildb.com/api/json/v1/1/search.php?s=' + name);
    request('http://www.thecocktaildb.com/api/json/v1/1/search.php?s=' + name, function (error, response, body) {
        if (!error) {
            console.log("ok");
            var object = JSON.parse(body);
            result = object.drinks;
            callback(result);
        } else {
            console.log("error");
            console.log(error.code);
            result = null;
            callback(result);
        }
    });
}

function getListOfCoctailsIngredient(ingredient, callback) {
    var result;
    console.log("request: " + 'http://www.thecocktaildb.com/api/json/v1/1/filter.php?i=' + ingredient);
    request('http://www.thecocktaildb.com/api/json/v1/1/search.php?s=' + ingredient, function (error, response, body) {
        if (!error) {
            console.log("ok");
            var object = JSON.parse(body);
            result = object.drinks;
            callback(result);
        } else {
            console.log("error");
            console.log(error.code);
            result = null;
            callback(result);
        }
    });
}

function getListOfCoctailRandom(callback) {
    var result;
    console.log("request: " + 'http://www.thecocktaildb.com/api/json/v1/1/random.php');
    request('http://www.thecocktaildb.com/api/json/v1/1/random.php', function (error, response, body) {
        if (!error) {
            console.log("ok");
            var object = JSON.parse(body);
            result = object.drinks;
            callback(result);
        } else {
            console.log("error");
            console.log(error.code);
            result = null;
            callback(result);
        }
    });
}

function delegateSlotCollection() {
    console.log("in delegateSlotCollection");
    console.log("current dialogState: " + this.event.request.dialogState);
    if (this.event.request.dialogState === "STARTED") {
        console.log("in Beginning");
        var updatedIntent = this.event.request.intent;
        //optionally pre-fill slots: update the intent object with slot values for which
        //you have defaults, then return Dialog.Delegate with this updated intent
        // in the updatedIntent property
        this.emit(":delegate", updatedIntent);
    } else if (this.event.request.dialogState !== "COMPLETED") {
        console.log("in not completed");
        // return a Dialog.Delegate directive with no updatedIntent property.
        this.emit(":delegate");
    } else {
        console.log("in completed");
        console.log("returning: " + JSON.stringify(this.event.request.intent));
        // Dialog is now complete and all required slots should be filled,
        // so call your normal intent handler.
        return this.event.request.intent;
    }
}

function randomPhrase(array) {
    // the argument is an array [] of words or phrases
    var i = 0;
    i = Math.floor(Math.random() * array.length);
    return (array[i]);
}

function isSlotValid(request, slotName) {
    var slot = request.intent.slots[slotName];
    //console.log("request = "+JSON.stringify(request)); //uncomment if you want to see the request
    var slotValue;

    //if we have a slot, get the text and store it into speechOutput
    if (slot && slot.value) {
        //we have a value in the slot
        slotValue = slot.value.toLowerCase();
        return slotValue;
    } else {
        //we didn't get a value in the slot.
        return false;
    }
}
