
function isEmpty(obj) {
  for (var i in ob) return false;
  return true;
}

var Compose = module.exports = function (definitions) {
  var instruments = {};
  var parentOutputs = {};
  var globalCallback;
  
  // Hook up the output function.
  definitions._ = Array.prototype.slice.call(arguments, 1).concat([function () {
    return globalCallback.apply(null, arguments);
  }]);
  
  // Initialize the instruments states
  for (var name in definitions) {
    // Create an instrument object.
    instruments[name] = {
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
    var instrument = instruments[name];

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
          instruments[sender].needsCallback = true;
          // Convert the sender name to a real live sender
          sender = instruments[sender].outputs;
          // Ensure the sender has a queue for the port
          if (!(port in sender)) sender[port] = [];
          // Add self to the output list
          sender[port].push({name: name, index: index});
          // Increment the counter
          instrument.counter++;
        } else {
          mode = 1;
        }
      }
      
      // Function definition mode
      if (mode === 1) {
        instrument.fn = part;
        mode = 2;
        return;
      }
      
      // Extra arg definition mode
      if (mode === 2) {
        instrument.extraArgs.push(part);
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
          var receiver = instruments[route.name]
          receiver.pendingData[route.index] = arg;
          receiver.counter--;
          if (receiver.counter === 0) {
            execute(receiver);
          }
        });
      }
    }
  }
  
  function execute(instrument) {
    
    var args = instrument.extraArgs.concat(instrument.pendingData);
    if (instrument.needsCallback) {
      args.push(function callback() {
        dispatch(instrument.outputs, arguments);
      });
    }
    
    // Reset the state
    for (var index in instrument.pendingData) instrument.counter++;
    instrument.pendingData = [];
    
    instrument.fn.apply(null, args);
  }
  
  return function instrumentEngine() {

    // Grab the last arguments as the callback
    globalCallback = arguments[arguments.length - 1];

    // Dispatch any arguments coming into the engine
    dispatch(instruments._.outputs, arguments);
    
    // Look for ready to start functions too
    // Look for any ready functions and start them
    for (var name in instruments) {
      if (name !== '_') {
        var instrument = instruments[name];
        if (instrument.counter === 0) {
          execute(instrument);
        }
      }
    }
  };
}
