/*
Copyright (c) 2010 Tim Caswell <tim@creationix>, Elijah Insua <tmpvar@gmail.com>

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

var Conduct = function (definitions) {
  var performers = {};
  var parentOutputs = {};
  var globalCallback;
  
  // Hook up the output function.
  definitions._ = Array.prototype.slice.call(arguments, 1).concat([function () {
    return globalCallback.apply(null, arguments);
  }]);
  
  // Initialize the performers states
  for (var name in definitions) {
    // Create an performer object.
    performers[name] = {
      // These are the extra static args that will be fed to the function.
      extraArgs: [],
      // This is a counter of pending inputs
      counter: 0,
      // This will hold the dynamic arguments we got from other functions.
      pendingData: [],
      // This tells us where to route the resulting data to.
      outputs: {},
      // Does this function needs a callback
      needsCallback: false
    };
  }
  
  // Parse the configurations
  for (var name in definitions) {
    var performer = performers[name];

    // Use a mini state-machine to parse the parts
    var mode = 0;
    var index = 0;
    definitions[name].forEach(function (part) {
      // Dependency definition mode
      if (mode === 0) {
        if (typeof(part) === 'string') {
          if (!(/^(?:_|[a-z]+)[0-9]+$/i).test(part)) {
            throw new Error("Invalid dependency: " + JSON.stringify(part));
          }
          // Parse out the port index
          var port = part.match(/[0-9]+$/)[0];
          // Get the rest as the sender name
          var sender = part.substr(0, part.length - port.length);
          // Tell the sender it needs a callback
          performers[sender].needsCallback = true;
          // Convert the sender name to a real live sender
          sender = performers[sender].outputs;
          // Ensure the sender has a queue for the port
          if (!(port in sender)) sender[port] = [];
          // Add self to the output list
          sender[port].push({name: name, index: index});
          // Increment the counter
          performer.counter++;
        } else {
          mode = 1;
        }
      }
      
      // Function definition mode
      if (mode === 1) {
        performer.fn = part;
        mode = 2;
        return;
      }
      
      // Extra arg definition mode
      if (mode === 2) {
        performer.extraArgs.push(part);
      }
      index++;
    });
  }
  
  // Dispatch arguments to everyone listening for it.
  function dispatch(routes, args) {
    for (var index in routes) {
      var arg = args[index];
      if (typeof arg !== 'undefined') {
        routes[index].forEach(function (route) {
          var receiver = performers[route.name]
          receiver.pendingData[route.index] = arg;
          receiver.counter--;
          if (receiver.counter === 0) {
            execute(receiver);
          }
        });
      }
    }
  }
  
  function execute(performer) {
    
    var args = performer.extraArgs.concat(performer.pendingData);
    if (performer.needsCallback) {
      args.push(function callback() {
        dispatch(performer.outputs, arguments);
      });
    }
    
    // Reset the state
    for (var index in performer.pendingData) performer.counter++;
    performer.pendingData = [];
    
    performer.fn.apply(null, args);
  }
  
  return function performerEngine() {

    // Grab the last arguments as the callback
    globalCallback = arguments[arguments.length - 1];

    // Dispatch any arguments coming into the engine
    dispatch(performers._.outputs, arguments);
    
    // Look for ready to start functions too
    // Look for any ready functions and start them
    for (var name in performers) {
      if (name !== '_') {
        var performer = performers[name];
        if (performer.counter === 0) {
          execute(performer);
        }
      }
    }
  };
}

// Hook into commonjs module systems
if (typeof module !== 'undefined' && "exports" in module) {
  module.exports = Conduct;
}