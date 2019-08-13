const gamepad = require("gamepad");
const robot = require("robotjs");
const fs = require("fs");
const activeWin = require('active-win');

const configFolder = './configs/';

function JoystickMapper(onConfigChange, logger){
  function log(str, obj){
    logger ? logger(str,obj) : console.log(str);
  }

  log('Initializing JoystickMapper...');

  var enabled = false;
  var device;
  var axisStates = [];
  var buttonStates = [];
  var axisPolling = 150;
  var btnListeners = {};
  var axisIntervals = [];
  var configs;
  var defaultConfig = null;
  var currentConfig = null;
  var lastApp;
  var labelReg = /([0-9]{0,1})(axis|btn)([0-9]+)([+\-]{0,1})/;
  var AXIS_INFO = {
    DEVICE: 1,
    TYPE: 2,
    ID: 3,
    SIGN: 4
  };

  function saveConfig(config){
    if(!config.filename) config.filename = (config.id || config.title) + '.js';
    var filename = config.filename;
    delete config.filename;
    fs.writeFileSync(configFolder + filename, JSON.stringify(config, null, 2), 'utf8');
    log('Saved profile: ' + filename);
    return true;
  }

  function deleteConfig(fn,cb){
    log('Deleted profile: ' + fn);
    fs.unlinkSync(configFolder+fn);
  }

  function evalFunc(str){
    try {
      return eval('(' + str + ')');
    } catch(e){
      log('Error evaluating user-defined function: ', e);
      return str;
    }
  }

  function loadConfigs(){
    log('(Re)loading profiles...');
    currentConfig = null;
    configs = [];
    fs.readdirSync(configFolder).forEach(file => {
       var str = fs.readFileSync(configFolder + file, 'utf8');
       try {
         var cfg = eval(`(${str})`);
         cfg.filename = file;
         if(typeof cfg.init == "string") cfg.init = evalFunc(cfg.init);
         if(typeof cfg.destroy == "string") cfg.destroy = evalFunc(cfg.destroy);

         Object.keys(cfg.inputs).forEach(function(k){
           var i = cfg.inputs[k];

           if(typeof i.callback == "string") i.callback = evalFunc(i.callback)
         });

         configs.push(cfg);

         log('Loaded Profile:', cfg.id);
       } catch(e){
         log('Error loading profile: ', e);
       }
    });

    // Assign id if not set.
    var i = 0;
    configs.forEach(function(cfg){
      if(cfg.default) defaultConfig = cfg;
      if(!cfg.id){
        cfg.id = cfg.app || 'cfg_' + i;
        i++;
      }
    });

    if(defaultConfig){
      setActiveConfig(defaultConfig);
    }
  }

  function getConfigById(id){
    configs.forEach(function(cfg){
      if(cfg.id == id) return id;
    });
  }

  function configureInput(axis, conf){
    var axisInfo = axis.match(labelReg);
    if(axisInfo){
      var listenerHash = (axisInfo[AXIS_INFO.DEVICE] || 'all') + "_" + axisInfo[AXIS_INFO.TYPE] + axisInfo[AXIS_INFO.ID];
      switch(axisInfo[AXIS_INFO.TYPE]){
        case 'axis':
          var dev = parseInt(axisInfo[AXIS_INFO.DEVICE]);
          var num = parseInt(axisInfo[AXIS_INFO.ID]);

          axisIntervals.push(setInterval(function(){
            if(!enabled) return;
            if(!isNaN(dev)){
              pwmAxis(conf, 'axis', dev, num,
                axisInfo[AXIS_INFO.SIGN]);
            }
          }, conf.pwm || conf.polling || axisPolling));

        break;
        case 'btn':
          if(conf.polling){
            var dev = parseInt(axisInfo[AXIS_INFO.DEVICE]);
            var num = parseInt(axisInfo[AXIS_INFO.ID]);

            axisIntervals.push(setInterval(function(){
              if(!enabled) return;
              if(!isNaN(dev)){
                var value = buttonStates[dev][num] ? 1 : 0;
                pwmAxis(conf, 'btn', dev, num, "");
              }
            }, conf.pwm || conf.polling || axisPolling));
          } else {
            btnListeners[listenerHash] = conf;
          }
        break;
      }
    }

  }

  function keyToggle(key, down){
    robot.keyToggle(key, down, []);
  }

  function pwmAxis(conf, type, dev, num, sign){
    var axisListener = conf;

    function getValue(){
      return type == "axis" ? axisStates[dev][num] : buttonStates[dev][num];
    }

    var value = getValue();


    // Dont continue if there is nothing to do!
    if(!axisListener) return;

    var absValue;

    if(sign == "-" || sign == "+"){
      if(sign == "-" && value > 0) return;
      if(sign == "+" && value < 0) return;
      value = Math.abs(value);
    } else
    if(sign == "" && type == "axis"){
      absValue = (1 + value) / 2;
    } else if(sign == "" && type == "btn"){
      absValue = value;
    }

    // Handle deadzones for axis
    var dz = axisListener.deadzone || currentConfig.deadzone;
    if(dz){
      if(Math.abs(value) < dz) value = 0;
      else value = (value + ( value > 0 ? -dz : dz ) ) / (1-dz);
    }

    // Handle key stroke emulation
    if(axisListener.key){
      // Pulse mode
      if(axisListener.pwm && type == "axis"){
        if(value < 0.01) return;
        keyToggle(axisListener.key, 'down',[]);
        setTimeout(function(){

          if(sign == "+" && getValue() < 0.9 || sign == "-" && getValue() > -0.9 || !enabled ) keyToggle(axisListener.key, 'up',[]);
          else log('full val skip');
        }, (axisListener.pwm * ( absValue ? absValue : value ) ));
      } else {
        // Boolean mode
        keyToggle(axisListener.key, value > 0.1 ? 'down' : 'up');
      }
      return;
    }

    // Handle mouse emulation
    if(axisListener.mouseX){
      if(value==0) return;
      var m = robot.getMousePos();
      robot.moveMouseRelative(value*axisListener.scale,0);
      return;
    }
    if(axisListener.mouseY){
      if(value==0) return;
      var m = robot.getMousePos();
      robot.moveMouseRelative(0,value*axisListener.scale);
      return;
    }
    if(axisListener.click){
      robot.mouseToggle(value > 0 ? 'down' : 'up', axisListener.click);
      return;
    }

    // Special roles such as enabler, changeCfg etc.
    if(axisListener.enabler && value > 0 && type == 'btn'){
      enabled = !enabled;
      return;
    }

    if(axisListener.setActiveConfig){
      setActiveConfigById(axisListener.setActiveConfig);
    }
    
    if(axisListener.callback && typeof axisListener.callback == "function"){
      axisListener.callback.call(currentConfig, robot, value);
    }

  }

  function setActiveConfig(cfg){
    if(!cfg) return;
    if(currentConfig && cfg.id == currentConfig.id) return;

    if(currentConfig && typeof currentConfig.destroy == "function"){
      currentConfig.destroy.call(currentConfig, robot);
    }

    // Why did I clone this? - Oh yeah, so default settings like enabled is reset upon each activation.
    //cfg = JSON.parse(JSON.stringify(cfg));

    log('Setting active config:', cfg.id);

    axisIntervals.map(clearInterval);

    axisIntervals = [];
    btnListeners = {};

    enabled = cfg.enabled === undefined ? true : cfg.enabled;
    if(!cfg) return;

    axisPolling = cfg.axisPolling  || 150;

    for(var k in cfg.inputs){
      configureInput(k,cfg.inputs[k]);
    }

    currentConfig = cfg;

    if(typeof cfg.init == "function"){
      cfg.init.call(currentConfig, robot);
    }
    if(onConfigChange) onConfigChange(currentConfig.id);
  }

  gamepad.init();

  // Get devices
  var devices = [];
  for (var i = 0, l = gamepad.numDevices(); i < l; i++) {
    device = gamepad.deviceAtIndex(i);
    devices.push(device);
    axisStates.push(device.axisStates.slice());
    buttonStates.push(device.buttonStates.slice());
  }

  // Create a game loop and poll for events
  setInterval(gamepad.processEvents, 16);

  robot.setMouseDelay(1);



  setInterval(function(){
  (async () => {
      win = await activeWin();
      var cfgSet = false;
      if( win.owner.name == lastApp ){ return; }
      log('App focus: ' + win.owner.name);
      configs.forEach(function(cfg){
        if(cfg.app == win.owner.name){
          setActiveConfig(cfg);
          cfgSet = true;
        }
      });
      if(!cfgSet){
        setActiveConfig(defaultConfig);
      }
      lastApp = win.owner.name;
  })();
  }, 1000);


  // Listen for move events on all gamepads
  gamepad.on("move", function (id, axis, value) {
    axisStates[id][axis] = value;
  });

  // Listen for button up events on all gamepads
  gamepad.on("up", function (id, num) {
    buttonStates[id][num] = false;
    var hash =  id + "_btn" + num;
    var conf = btnListeners[hash];
    if(!conf) hash = 'all' + "_btn" + num;
    conf = btnListeners[hash];

    if(conf) pwmAxis(conf, 'btn', id, num, "");
  });

  // Listen for button down events on all gamepads
  gamepad.on("down", function (id, num) {
    buttonStates[id][num] = true;
    var hash =  id + "_btn" + num;
    var conf = btnListeners[hash];
    if(!conf) hash = 'all' + "_btn" + num;
    conf = btnListeners[hash];

    if(conf) pwmAxis(conf, 'btn', id, num, "");
  });


  loadConfigs();

  this.loadConfigs = loadConfigs;
  this.saveConfig = saveConfig;
  this.deleteConfig = deleteConfig;
  this.setActiveConfig = setActiveConfig;
  this.getActiveConfig = function(){
    return currentConfig.id;
  }
  this.setActiveConfigById = function(id){
    return setActiveConfig(getConfigById(id));
  }

  this.getDefaultConfig = function(){
    return defaultConfig.id;
  }

  this.getConfigs = function(){
    return configs;
  }
  this.getAxisStates = function(){
    return axisStates;
  }
  this.getButtonStates = function(){
    return buttonStates;
  }
  this.getDevices = function(){
    return devices;
  }
};

module.exports = JoystickMapper;
