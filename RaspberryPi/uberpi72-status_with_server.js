/*
 * Copyright 2010-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

//node.js deps
//***********uberchanges
var beautify = require("js-beautify").js_beautify;
var arDrone = require('ar-drone');
var gpio = require("rpi-gpio");
var http = require('http');
var fs = require('fs');
var url = require('url');


//npm deps

//app deps
const thingShadow = require('..').thingShadow;
const isUndefined = require('../common/lib/is-undefined');
const cmdLineProcess   = require('./lib/cmdline');

//begin module

//==== uberJarvis Option ===============================================================
 var a1 = "==============================================================================\n" + 
          "██╗   ██╗██████╗ ███████╗██████╗      ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗\n" +
          "██║   ██║██╔══██╗██╔════╝██╔══██╗     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝\n" +
          "██║   ██║██████╔╝█████╗  ██████╔╝     ██║███████║██████╔╝██║   ██║██║███████╗\n" +
          "██║   ██║██╔══██╗██╔══╝  ██╔══██╗██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║\n" +
          "╚██████╔╝██████╔╝███████╗██║  ██║╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║\n" +
          " ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝\n"+
          "==============================================================================";
          

//Set thing options
var thingName = "uberpi72"

//Set Drone Options
var client = arDrone.createClient({ip : '192.168.69.1'});
client.ftrim() //flat trim drone to balance

//Set Relay Options 26 pin PI
var channel1 = 16;
var channel2 = 11;
var channel3 = 13;
var channel4 = 15;

//Set Relay Options 40 pin pi
//var channel1 = 29;
//var channel2 = 31;
//var channel3 = 33;
//var channel4 = 35;

switch1 = { on: channel1, off: channel2 };
switch2 = { on: channel3, off: channel4 };

var systemInitialized = false;
var powerIsOn = false;
var delay = 500;
var count = 0;
var max   = 1;

//Drone Avoidance system
var droneMoveSpeed = .3
var droneAvoidance = 0

//uberHUD web interface values
var flightStatistics = {}
var active_carousel = 0;
var hudLog = '';

//promoting opFunction to global variable (Scope was local to thingShadows)
var uberpi72Values={ };
uberpi72ThingState = {};
var uberpi72CurrentThingState = { state : {}, timestamp : {} };
var flightStatistics = {}
var opFunction;
var debug = false; 
//=================================================================

function processTest( args ) {
//
// The thing module exports the thing class through which we
// can register and unregister interest in thing shadows, perform
// update/get/delete operations on them, and receive delta updates
// when the cloud state differs from the device state.
//
const thingShadows = thingShadow({
  keyPath: args.privateKey,
  certPath: args.clientCert,
  caPath: args.caCert,
  clientId: args.clientId,
  region: args.region,
  reconnectPeriod: args.reconnectPeriod
});

//
// Track operations in here using clientTokens as indices.
//
var operationCallbacks = { };

var role='DEVICE';

if (args.testMode===1)
{
   role='MOBILE APP';
}

var mobileAppOperation='update';

//
// Simulate the interaction of a mobile device and a remote thing via the
// AWS IoT service.  The remote thing will be a dimmable color lamp, where
// the individual RGB channels can be set to an intensity between 0 and 255.  
// One process will simulate each side, with testMode being used to distinguish 
// between the mobile app (1) and the remote thing (2).  The mobile app
// will wait a random number of seconds and then change the LED lamp's values;
// the LED lamp will synchronize with them upon receipt of an .../update/delta.
//
thingShadows
  .on('connect', function() {
    console.log('|*| Connected to [' +thingName+ '] things instance, registering thing name');

    if (args.testMode === 1)
    {
       thingShadows.register( thingName, { ignoreDeltas: true,
                                              persistentSubscribe: true } );
    }
    else
    {
       thingShadows.register( thingName );
    }
    var uberpi72ShadowState = { };

    opFunction = function(thingValues) {
       if (args.testMode === 1)
       {
//
// The mobile app sets new values for the LED lamp.
//
          //uberpi72Values.marklaunch = 0;
          uberpi72ShadowState={state: { desired: uberpi72Values }};
       }

       var clientToken;
       if (args.testMode === 1 || thingValues != null) {
            if (thingValues) {
                uberpi72Values = thingValues;
                if (thingValues.poweron == 0) {
                    //poweroff detected, setting shadow state to null
                    uberpi72ShadowState={ state: null };
                    uberpi72ThingState={ state: null };
                    systemOutput("|*| System Offline: Removing Jarvis Shadow.");
                    powerIsOn = false;
                } else {
                    uberpi72ShadowState={state: { desired: uberpi72Values }};
                    systemOutput("|*| Uploading Jarvis Shadow: " + JSON.stringify(thingValues));
                }  
                
                if (debug === true) { console.log("Device update: \n" + beautify(JSON.stringify(uberpi72ShadowState), 2)); }
                mobileAppOperation = 'update';
            }

            if (mobileAppOperation === 'update')
            {
               clientToken = thingShadows[mobileAppOperation](thingName,
                                                              uberpi72ShadowState );
            }
            else // mobileAppOperation === 'get'
            {
               clientToken = thingShadows[mobileAppOperation](thingName );
            }
            operationCallbacks[clientToken] = { operation: mobileAppOperation,
                                                cb: null };
//
// Force the next operation back to update in case we had to do a get after
// a 'rejected' status.
//
            mobileAppOperation = 'update';
        }
       else
       {
//
// The device gets the latest state from the thing shadow after connecting.
//
          clientToken = thingShadows.get(thingName);
          operationCallbacks[clientToken] = { operation: 'get', cb: null };
       }
       if (args.testMode === 1) {
          operationCallbacks[clientToken].cb =
             function( thingName, operation, statusType, stateObject ) {

                if (debug === true) { console.log(role+':'+operation+' '+statusType+' on '+thingName+': '+
                            beautify(JSON.stringify(stateObject.state), 2)); }
//
// If this operation was rejected, force a 'get' as the next operation; it is
// probably a version conflict, and it can be resolved by simply getting the
// latest thing shadow.
//
                if (statusType !== 'accepted')
                {
                   mobileAppOperation = 'get';
                }
                opFunction();
             };
       }
       else
       {
          operationCallbacks[clientToken].cb =
             function( thingName, operation, statusType, stateObject ) { 

                if (debug === true) { console.log(role+':'+operation+' '+statusType+' on '+thingName+': '+
                            beautify(JSON.stringify(stateObject)), 2); }
             };
       }
    };
    
    if (systemInitialized === false) {
       opFunction({ poweron: 0 })   
       systemInitialized = true;
      }
      else {
        opFunction();
      }
    });
  
thingShadows 
  .on('close', function() {
    console.log('close');
    thingShadows.unregister( thingName );
  });
thingShadows 
  .on('reconnect', function() {
    console.log('reconnect');
    if (args.testMode === 1)
    {
       thingShadows.register( thingName, { ignoreDeltas: true,
                                              persistentSubscribe: true } );
    }
    else
    {
       thingShadows.register( thingName );
    }
  });
thingShadows 
  .on('offline', function() {
    console.log('offline');
  });
thingShadows
  .on('error', function(error) {
    console.log('error', error);
  });
thingShadows
  .on('message', function(topic, payload) {
    console.log('message', topic, payload.toString());
  });
thingShadows
  .on('status', function(thingName, stat, clientToken, stateObject) {
      if (!isUndefined( operationCallbacks[clientToken] ))
      {
         setTimeout( function() {
         operationCallbacks[clientToken].cb( thingName, 
              operationCallbacks[clientToken].operation,
              stat,
              stateObject );

         delete operationCallbacks[clientToken];
         }, 2000 );
      }
      else
      {
         console.warn( 'status:unknown clientToken \''+clientToken+'\' on \''+
                       thingName+'\'' );
      }
  });
//
// Only the simulated device is interested in delta events.
//
if (args.testMode===2)
{
   thingShadows
     .on('delta', function(thingName, stateObject) {
         console.log("------------------------------------------------------------")
         if (debug === true) { systemOutput(role+':delta detected on '+thingName+': \n' +
                            beautify(JSON.stringify(stateObject), 2)); }
            //Parse Delta thing State for Changes -- Only add things that match current time stamp
            var uberpi72DeltaThingState = { state : {}, timestamp : {} };
            var deltaTimeStamp = stateObject.timestamp;
            Object.keys(stateObject.state).forEach(function(key) {
            var val = stateObject.state[key];
            var timestamp = stateObject.metadata[key].timestamp;
            //console.log(val + ": " + timestamp);
            //console.log("Current time stamp for [" + key + "] is " + uberpi72CurrentThingState.timestamp[key])
            if (timestamp === deltaTimeStamp) {
                  //Add to delta object
                  console.log("[" + key + "] has been updated, adding.")
                  uberpi72DeltaThingState.state[key] = val;
                  uberpi72DeltaThingState.timestamp[key] = timestamp;
              }              
          });
          console.log("[Processed Delta Values]\n" + beautify(JSON.stringify(uberpi72DeltaThingState), 2));
          //Execute Function on delta state changes
          executeJarvisActions(uberpi72DeltaThingState.state)
          
          //*** Need to find out where this is used
          uberpi72Values=stateObject.state;
     });
}

thingShadows
  .on('timeout', function(thingName, clientToken) {
      if (!isUndefined( operationCallbacks[clientToken] ))
      {
         operationCallbacks[clientToken].cb( thingName,
              operationCallbacks[clientToken].operation,
              'timeout',
              { } );
         delete operationCallbacks[clientToken];
      }
      else
      {
         console.warn( 'timeout:unknown clientToken \''+clientToken+'\' on \''+
                       thingName+'\'' );
      }
  });
}

module.exports = cmdLineProcess;

if (require.main === module) {
  cmdLineProcess('connect to the AWS IoT service and demonstrate thing shadow APIs, test modes 1-2',
                 process.argv.slice(2), processTest );
}

//*********************** Jarvis Functions
function executeJarvisActions(thingValues) {
    
    if (thingValues.poweron === 1 && powerIsOn === false) {
              //Log banner and turn power on
              systemOutput(a1);
              executeShowTime("on");
              powerIsOn = true;
    } else if (powerIsOn === false) {
        systemOutput("|#| Power required to deploy mark. Please initiate power on procedures.");
    } else if (thingValues.poweron === 0) {        
            executeJarvisFlightPlan("land");
            systemOutput("|*| Powering Down Mark Platform");
            //turn off showtime and delete device shadow
            executeShowTime("off", opFunction({ poweron: 0 }));
    } else {
        systemOutput("[-] Executing Jarvis Action ==================================================");
        systemOutput('|-| Processing JSON: ' + JSON.stringify(thingValues));
        if (thingValues.marklaunch === 1) {
            systemOutput("|*| Mark 42 Launch detected. Executing launch procedures...");
            executeJarvisFlightPlan("deploy");
        } else if (thingValues.land === 1) {
            executeJarvisFlightPlan("land");
        } else if (thingValues.movedirection !== "" && thingValues.movedirection !== undefined) {
            console.log("move: \"" + thingValues.movedirection + "\"")
            updateJarvisFlightPlan(thingValues.movedirection);
        } else if (droneAvoidance === 1 && thingValues.avoidanceDirection != undefined) {
            systemOutput('|-| Avoidance system moving [' + thingValues.avoidanceDirection + ']');
            updateJarvisFlightPlan(thingValues.movedirection);
        } else { 
            systemOutput("|*| Standing by for Mark Procedure.");
        }
    }
        
        //Get avoidance system State
        if (thingValues.avoidance != undefined) {
          droneAvoidance = thingValues.avoidance;
          if (thingValues.avoidance === 1) {
            systemOutput('|-| Object Avoidance System [ACTIVE].')
          } else {
            systemOutput('|-| Object Avoidance System [DISABLED].')
          }
          
        }
        //Get active carousel for uberJARIS HUD
        if (thingValues.active_carousel != undefined) {
          active_carousel = thingValues.active_carousel;
          if (active_carousel === 3) {
            setTimeout(function () {
              executeJarvisFlightPlan("land");
              executeShowTime("off", opFunction({ poweron: 0 }));
            }, 6000);
          }
        }
}

function executeJarvisFlightPlan(mode) {
    
    if (mode === "deploy") {
        systemOutput("|*| Mark 42 Launch Complete.")
        client.takeoff();
    } else if (mode === "land") {
        systemOutput("|*| Mark 42 Landing")
        client.stop();
        client.land();
    }
}

function updateJarvisFlightPlan(direction) {
    
    droneStop = function () {
      client.stop();
    }
    
    systemOutput("|*| Updating flight plan [" +direction+ "]");
    if (direction === "up") { 
       client.up(droneMoveSpeed + .15)
       setTimeout(droneStop, 1200)
    } else if (direction === "down") { 
       client.down(droneMoveSpeed)
       setTimeout(droneStop, 1200)
    } else if (direction === "left") {
       client.left(droneMoveSpeed)
       setTimeout(droneStop, 1200)
    } else if (direction === "right") {
      client.right(droneMoveSpeed)
      setTimeout(droneStop, 1200)
    } else if (direction === "forward") {
      client.front(droneMoveSpeed)
      setTimeout(droneStop, 1200)
    } else if (direction === "back" || direction === "backward") {
      client.back(droneMoveSpeed)
      setTimeout(droneStop, 1200)
    } else if (direction === "flip" ) {
      client.animate('flipBehind', 1000);
    } else if (direction === "land") {
      systemOutput("|*| Mark 42 Landing")
      client.land();
      client.stop();
    } else if (direction === "hover" || direction === "takeoff") {
      client.ftrim();
      client.takeoff();
    }
}

function executeShowTime(mode, callback) {
    systemOutput("|*| Showtime status updated. Mode set to [" + mode + "]");
    if (mode === "on") {
        gpio.setup(switch1.on, gpio.DIR_OUT, relay_on(switch1.on));
        setTimeout(function() {
            gpio.setup(switch2.on, gpio.DIR_OUT, relay_on(switch2.on))
        }, delay);   
    }
    else {
        gpio.setup(switch1.off, gpio.DIR_OUT, relay_on(switch1.off));
        setTimeout(function() {
            gpio.setup(switch2.off, gpio.DIR_OUT, relay_on(switch2.off))
        }, delay);          
    }    
}

function relay_on(pin) {
    if (count >= max) {
        gpio.destroy(function() {
            //console.log('Closed pins, now exit');
            count=0;
        });
        return;
    }
    
    setTimeout(function() {
        //console.log("Setting pin [" +pin+ "] high.");
        gpio.write(pin, 1, relay_off(pin));
        count+=1;
    }, delay);
}
 
function relay_off(pin) {
    setTimeout(function() {
        //console.log("Setting pin [" +pin+ "] low.");
        gpio.write(pin, 0, relay_on(pin));
    }, delay);
}

function systemOutput(output) {
    
      console.log(output) ;
      
      if (hudLog === "") {
          hudLog = output;
      }
      else {
          hudLog += "\n" + output;
      }
}
    
client.on('navdata', function(data) {
  //data.demo contains the current flight stats
  //data.droneState seems to have current settings
  //data.visionDetect needs investigation
  if (data.demo !== undefined) {
      flightStatistics.demo = data.demo;
  }
  if (data.droneState !== undefined) {
      flightStatistics.droneState = data.droneState;
  }
  //console.log(data.droneState);
  //console.log(data.demo);
  //console.log(data.visionDetect);
});

console.log ("|*| Loading Visual Interface Command Server.")
http.createServer(function(request, response){
    var path = url.parse(request.url).pathname;
    if (request.method === 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;
            //console.log("Partial body: " + body);
        });
        request.on('end', function () {
            console.log("Received Post Request at path [" + path + "] " + body);
            if (path === '/setcarousel') {
                if (body === "active_carousel=2") {
                  active_carousel = 2;
                } else if (body === "active_carousel=1") {
                  active_carousel = 1;
                } else {
                  active_carousel = 0;
                }
            }
        });
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end('post received');
    }
    else {
      if (path=="/carousel") {
          response.writeHead(200, {"Content-Type": "text/plain"});
          //current_carousel = Math.floor(Math.random() * 3);
          response.end(active_carousel.toString());
          if (debug ===true) {
              //console.log("Current carousel is [" +active_carousel+ "]"); 
          }
      } else if (path=="/markstatus") {
          response.writeHead(200, {"Content-Type": "text/plain"});
          response.end(hudLog);
          hudLog = '';
      } else if (path=="/shadowstatus") {
          response.writeHead(200, {"Content-Type": "application/json"});
          response.end(JSON.stringify(uberpi72Values));
      } else if (path=="/flightstats") {
          response.writeHead(200, {"Content-Type": "application/json"});
          response.end(JSON.stringify(flightStatistics));
      } else {
          fs.readFile('./index.html', function(err, file) {  
              if(err) {  
                  return;  
              }  
              response.writeHead(200, { 'Content-Type': 'text/html' });  
              response.end(file, "utf-8");  
          });
      }
    }
}).listen(8001);

