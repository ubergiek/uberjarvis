/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.

//NOTE ********************************************
//For this to run, you will have to update the audio source locations to your own S3 location
//Change 'https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES to your S3 location. You can pull the audio from
//https://github.com/ubergiek/uberjarvis/audio
//Also make sure to update the AWS.IotData endpoint to reflect your endpoint.

// Import AWS-SDK
var AWS = require('aws-sdk');

// ---------------------Begin uberJarvis IoT Functions ---------------------------

function updateThingShadow(thingValues, callback) {
    var iotdata = new AWS.IotData({endpoint: 'ENTER YOUR IOT ENDPOINT HERE'});
    var thingupdate = { };
    var result = {result: "none"};
    thingupdate = {state: { desired: thingValues }};
    var params = {
        payload: JSON.stringify(thingupdate),
        thingName: 'uberpi72' /* required */
    };
    console.log("Attempting to update thing shadow.")
    iotdata.updateThingShadow(params, function (err, data) {
        console.log("Updating thing shadow.")
        if (err)
        {
            result.result = "error";
            console.log(err, err.stack); // an error occurred
            context.fail('Something went wrong updating the thing shadow.');
        }
        else
        {
            result.result = "success";
            console.log("IoT data returned:");
            console.log(data);           // successful response
            callback();
    }});
}

exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

        if (event.session.application.applicationId !== "ENTER YOUR APPLICATION ID HERE") {
             context.fail("Invalid Application ID");
        }


        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("MyDroneIntent" === intentName) {
        setDroneActionInSession(intent, session, callback);
    } else if ("DroneMovementIntent" === intentName) {
        executeDroneMovement(intent, session, callback);
    } else if ("updateHUD" === intentName) {
        updateUberJarvisHud(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "JARVIS Activated";
    var speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_markplatformactive.mp3' />";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_markplatformactive.mp3' />";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
function setDroneActionInSession(intent, session, callback) {
    var cardTitle = "Mark Platform Activated";
    var droneActionsSlot = intent.slots.DroneActions;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var thingValues = {};

    if (droneActionsSlot.value === "mark 42") {
        droneAction = droneActionsSlot.value;
        sessionAttributes = createDroneActionAttributes(droneAction);
        //speechOutput = "Mark forty two deployment initiated";
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_deploymark42.mp3' />"

        thingValues.marklaunch = 1;
    }
    else if (droneActionsSlot.value === "on") {
        droneAction = droneActionsSlot.value;
        sessionAttributes = createDroneActionAttributes(droneAction);
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_poweron.mp3' />";
        thingValues.poweron = 1;
    }
    else if (droneActionsSlot.value === "activate avoidance" || droneActionsSlot.value === "activate avoidance system") {
        droneAction = droneActionsSlot.value;
        sessionAttributes = createDroneActionAttributes(droneAction);
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_avoidance_active.mp3' />";
        shouldEndSession = false;
        thingValues = { avoidance: 1 }
    }
    else if (droneActionsSlot.value === "disable avoidance") {
        droneAction = droneActionsSlot.value;
        sessionAttributes = createDroneActionAttributes(droneAction);
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_avoidance_disabled.mp3' />";
        shouldEndSession = false;
        thingValues = { avoidance: 0 }
    }
    else if (droneActionsSlot.value === "off" || droneActionsSlot.value === "down") {
        droneAction = droneActionsSlot.value;
        sessionAttributes = createDroneActionAttributes(droneAction);
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_photon_poweroff.mp3' />";
        shouldEndSession = true;
        thingValues = { active_carousel: 3 }
    } else {
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_unknown_procedure.mp3' />";
        //thingValues = {};
    }

    updateThingShadow(thingValues, function doneUpdating () {
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

function executeDroneMovement(intent, session, callback) {
    var cardTitle = "Flight Control";
    var droneMovementSlot = intent.slots.DroneMovement;
    var droneAllowedMovementSlot = intent.slots.DroneAllowedMovement;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var thingValues = {};

    console.log(droneAllowedMovementSlot.value);
    console.log(droneMovementSlot.value);

    if (droneMovementSlot.value === "up" || droneMovementSlot.value === "down" ||
        droneMovementSlot.value === "left" || droneMovementSlot.value === "right" ||
        droneMovementSlot.value === "forward" || droneMovementSlot.value === "back" ||
        droneMovementSlot.value === "flip" ||  droneMovementSlot.value === "hover" ||
        droneMovementSlot.value === "takeoff" || droneMovementSlot.value === "clockwise" ||
        droneMovementSlot.value === "counter clockwise") {

        if (droneMovementSlot.value === "up") {
            speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_move_up.mp3' />";
        }
        else if (droneMovementSlot.value === "down") {
            speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_move_down.mp3' />";
        }
        else if (droneMovementSlot.value === "left") {
            speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_move_left.mp3' />";
        }
        else if (droneMovementSlot.value === "right") {
            speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_move_right.mp3' />";
        }
        else if (droneMovementSlot.value === "forward") {
            speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_move_forward.mp3' />";
        }
        else if (droneMovementSlot.value === "back") {
            speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_move_back.mp3' />";
        }
        else if (droneMovementSlot.value === "flip") {
            speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_move_flip_brit.mp3' />";
        }
        sessionAttributes = createDroneActionAttributes("Flight Control (" + droneMovementSlot.value + ")");
        thingValues.movedirection = droneMovementSlot.value;

        //Detect allowed movement distance based on slot value
        if (droneAllowedMovementSlot.value === "1" || droneAllowedMovementSlot.value === "2") {
            thingValues.movedistance = parseInt(droneAllowedMovementSlot.value);
        } else {
            thingValues.movedistance = 0;
        }
    } else if (droneMovementSlot.value === "stop" || droneMovementSlot.value === "land") {
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_move_land.mp3' />";
        sessionAttributes = createDroneActionAttributes("Flight Control (" + droneMovementSlot.value + ")");
        thingValues.land = 1;
    }
    else if (droneMovementSlot.value === "exit") {
        //ToDo add exit to leave voice control
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_poweroff.mp3' />";
        sessionAttributes = createDroneActionAttributes("Disable Mark Platform");
        shouldEndSession = true;
    }

    updateThingShadow(thingValues, function doneUpdating () {
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

function updateUberJarvisHud(intent, session, callback) {
    var cardTitle = "HUD Command";
    var hudSlotValue = intent.slots.HudCarouselActions;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var thingValues = {};

    if (hudSlotValue.value === "dashboard") {
        //This function will set the things values for 'active_carousel' to 0 (The dashboard index)
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_hud_dashboard.mp3' />";
        thingValues.active_carousel = 0;
    }
    else if (hudSlotValue.value === "hud" || hudSlotValue.value === "heads-up display" || hudSlotValue.value === "Hud") {
        //This function will set the things values for 'active_carousel' to 1 (Heads-up Display)
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_hud_hud.mp3' />";
        thingValues.active_carousel = 1;
    }
    else if (hudSlotValue.value === "system status") {
        //This function will set the things values for 'active_carousel' to 2 (System Status)
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_hud_systemstatus.mp3' />";
        thingValues.active_carousel = 2;

    } else if (hudSlotValue.value === "exit") {
        speechOutput = "<audio src='https://ENTER YOUR S3 LOCATION TO THE AUDIO FILES/uberjarvis/uberjarvis_poweroff.mp3' />";
        shouldEndSession = true;
        thingValues = { poweron: 0 }
    }

    updateThingShadow(thingValues, function doneUpdating () {
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

function createDroneActionAttributes(droneAction) {
    return {
        droneAction: droneAction
    };
}

function getDroneActionFromSession(intent, session, callback) {
    var droneAction;
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    if (session.attributes) {
        droneAction = session.attributes.droneAction;
    }

    if (droneAction) {
        speechOutput = "The current procedure is " + droneAction + ". Goodbye.";
        shouldEndSession = true;
    } else {
        speechOutput = "No procedure selected";
    }

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    cardText = output;
    //Disable voice output for flight commands
    if (title === "Flight Control") {
        //output = "";
    }
    return {
        outputSpeech: {
            type: "SSML",
            ssml: "<speak>" + output + "</speak>"
        },
        card: {
            type: "Simple",
            title: "uberJARVIS",
            content: title + " - " //+ cardText
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
