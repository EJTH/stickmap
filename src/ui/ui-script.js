var ipcRenderer = require('electron').ipcRenderer;

var scriptEditor;
var devices = [];
var profiles = [];
var profileMap = {};
var $deviceTmpl = null;
var currentProfile = null;
var currentProfileId = null;

var labelReg = /([0-9]{0,1})(axis|btn)([0-9]+)([+\-]{0,1})/;
var AXIS_INFO = {
  DEVICE: 1,
  TYPE: 2,
  ID: 3,
  SIGN: 4
};

var profileScripts = [];
var activeScript = {};

function newProfile(){
  var i = 0;
  while(profileMap['profile'+i]) i++;
  var profile = {
    id: 'profile'+i,
    deadzone: 0.05,
    default: false,
    enabled: false,
    axisPolling: 100,
    inputs: {}
  }

  profiles.push(profile);
  profileMap['profile'+i] = profile;

  setCurrentProfile('profile'+i);
}

function buildProfileSelect(){
  var $profiles = [];
  profiles.forEach(function(profile){
    var $opt = $('<option>', { text: profile.title || profile.id, value: profile.id });
    profileMap[profile.id] = profile;
    $profiles.push($opt);
  });
  $('#profileSelect').empty();
  $('#profileSelect').append($profiles);
}

function refreshProfile(){
  setCurrentProfile(currentProfileId);
}

function setCurrentProfile(id){
  resetControllers();
  resetScripts();

  if(!profileMap[id]){
      id = profiles[0].id;
  }

  currentProfileId = id;

  var profile = profileMap[id];

  currentProfile = profile;

  var $profile = $('#profileSettings');
  $profile.find('[name]').val('');
  for(var k in profile){
    var value = profile[k];
    $input = $profile.find(`[name="${k}"]`);
    if($input.attr('type') == 'checkbox'){
      $input.prop('checked', value)
    } else {
      $input.val(value);
    }
    $input.trigger('input');
  }

  addProfileScript('Profile Source', e => JSON.stringify(profile, null, 2), e => 0)
  addProfileScript('profile.init', e => profile.init, v => profile.init = v);
  addProfileScript('profile.destroy', e => profile.destroy, v => profile.destroy = v);

  // Update UI for axis and buttons
  for(var k in profile.inputs){
    var axisInfo = k.match(labelReg);
    var val = profile.inputs[k];
    var sign = axisInfo[AXIS_INFO.SIGN];
    var $axis = $(`#${axisInfo[AXIS_INFO.TYPE]}_${axisInfo[AXIS_INFO.DEVICE]}_${axisInfo[AXIS_INFO.ID]}`);

    if(axisInfo[AXIS_INFO.TYPE] == "axis"){

      var $axisBtn = $axis.find(sign == "+"
        ? '.positive'
        : sign == "-"
          ? '.negative'
          : '.absolute');

      $axisBtn.find('.assignment-desc').text('('+getAxisDesc(val)+')');
    } else {
      var $btn = $(`#${axisInfo[AXIS_INFO.TYPE]}_${axisInfo[AXIS_INFO.DEVICE]}_${axisInfo[AXIS_INFO.ID]}`);
      $btn.find('.assignment-desc').text(getAxisDesc(val));
    }

    if(val.callback){
      var scriptName = `${axisInfo[AXIS_INFO.DEVICE]}${axisInfo[AXIS_INFO.TYPE]}${axisInfo[AXIS_INFO.ID]}.callback`;
      addProfileScript(scriptName, e => val.callback, v => val.callback = v);
    }
  }
  $('#profileSelect').val(currentProfileId);
  $('#scriptsList').trigger('change');
}

function setActiveScript(script){
  activeScript = script;
  $('#scriptsList').val(script.name);
  scriptEditor.setValue(script.src() || "function(){}");
}

function addProfileScript(name, src, onChange){
  var $opt = $('<option>',{text: name});
  var s = {
    name: name,
    src: src,
    onChange: onChange,
    opt: $opt
  };
  profileScripts.push(s);
  $('#scriptsList').append($opt);

  return s;
}

function resetScripts(){
  profileScripts = [];
  $('#scriptsList').empty();
  activeScript = {};
}

function getAxisTask(axisObj){
  if(axisObj.key) return 'key';
}

function getAxisDesc(axisObj){
  if(axisObj.key) return axisObj.key.length == 1 ? axisObj.key.toUpperCase() : axisObj.key;
  if(axisObj.mouseX) return 'Mouse X';
  if(axisObj.mouseY) return 'Mouse Y';
  if(axisObj.callback) return 'Script';
  if(axisObj.click) return `'${axisObj.click}' click`;
  if(axisObj.enabler) return 'Toggle enable';
  if(axisObj.setActiveConfig) return 'profile: ' + axisObj.setActiveConfig;
}

function setProfiles(p){
  profiles = p;
  profileMap = {};
  profiles.forEach(function(profile){
    profileMap[profile.id] = profile;
  });
  buildProfileSelect();
  console.log(currentProfileId);
  if(currentProfileId) setCurrentProfile(currentProfileId);
}

function resetControllers(){
  $('#controllers').empty();
  devices.forEach(createController);
}

function createController(device, deviceIndex){
  var $device = $deviceTmpl.clone();
  $device.find('.controller-name').text(device.description);
  var $axis = $device.find('.axis');
  $axis.remove();
  device.axisStates = device.axisStates.map(function(a,i){
    var $a = $axis.clone();
    $a.attr('id',`axis_${deviceIndex}_${i}`);
    $a.find('.progress').text(`Axis\u00a0#${i}`);
    $a.prop('axisId', deviceIndex + 'axis' + i);
    $device.find('.axis-list').append($a);
    return $a.find('.progress')[0];
  });

  device.buttonStates = device.buttonStates.map(function(b,i){
    var $b = $('<button><span class="button-num"></span><span class="assignment-desc">&nbsp;<br/></span>');
    $b.attr('id',`btn_${deviceIndex}_${i}`);
    $b.prop('axisId', deviceIndex + 'btn' + i);
    $b.find('.button-num').text(i);
    $device.find('.button-list').append($b);
    return $b[0];
  });

  $('#controllers').append($device);
}

function initIPC(){
  ipcRenderer.on('devicesInfo', (event, message) => {
    devices = message;
    devices.forEach(createController);
    ipcRenderer.send('getProfiles');
  });

  ipcRenderer.on('deviceStates', (event, message) => {
    devices.forEach(function(dev, id){
      dev.axisStates.forEach(function($axis, i){
        var val = message.axisStates[id][i];
        $axis.style.width = (((val + 1) / 2) * 100) + '%';
      });

      dev.buttonStates.forEach(function($btn, i){
        $btn.classList.toggle('danger', !!message.buttonStates[id][i]);
      });
    });
  });

  ipcRenderer.on('profiles', (event, message) => {
    setProfiles(message);
  });

  ipcRenderer.on('defaultProfile', (event, message) => {
    console.log('dp', message, profiles);
    setCurrentProfile(message);
  });

  ipcRenderer.on('log', (event, message) => {
    $('#log').prepend($('<pre>',{
      text : message.str + '\n' + (
        message.obj != null ?
          JSON.stringify(message.obj, null, 2)
          : ''
      )
    }));
  });

  setInterval(function(){
    ipcRenderer.send('getDeviceStates');
  }, 100);
}

function initUI(){
  $('#profileSelect').on('change', function(){
    setCurrentProfile(this.value);
  })

  // Range labels
  $('body').on('input', 'input[type="range"]', function(){
    $(this).next().text(this.value);
  });


  //Script Editor
  scriptEditor = CodeMirror(document.getElementById('scriptEditor'), {
    value: "function myScript(){return 100;}\n",
    mode:  "javascript"
  });

  scriptEditor.on('change', function(instance, changeObj){
    activeScript.onChange(instance.getValue());
  });

  $('#scriptsToggle').on('click', function(){
    setTimeout(function(){scriptEditor.refresh();},50);
  });

  $('#scriptsList').on('change',function(){
    setActiveScript(profileScripts[this.selectedIndex]);
  });

  $(document).on('click', '.collapsable .activator', function(e){
    $(this).parent().toggleClass('collapsed');
  });

  $('.fuse').each(function(a,b){
    $(b).contents().each(function() {
        if(this.nodeType == 3) $(this).remove();
    });
  });

  var inputConfigurator = new InputConfigurator;

  $('html').on('click', '.axis-buttons button, .button-list button', function(){
    var $this = $(this);
    var axis = $this.parents('.axis').prop('axisId') || $this.prop('axisId');

    var sign = "";
    if($this.hasClass('positive')) sign = "+";
    if($this.hasClass('negative')) sign = "-";
    console.log('test', axis)
    inputConfigurator.configure(axis+sign, currentProfile.inputs[axis+sign], nval => {
      console.log(nval, currentProfile, axis+sign);
      if(Object.keys(nval).length == 0) delete currentProfile.inputs[axis+sign];
      else currentProfile.inputs[axis+sign] = nval
      refreshProfile();
    });
  })

  $('#profileSettings').find('[name]').on('change', function(){
    switch(this.type){
      case "checkbox":
        currentProfile[this.name] = this.checked;
      break;
      case 'number':
        currentProfile[this.name] = parseInt(this.value);
      break;
      case 'range':
        currentProfile[this.name] = parsefloat(this.value);
      break;
      default:
        currentProfile[this.name] = this.value;
      break;
    }
    currentProfile[this.name] = this.type == "checkbox" ? this.checked : this.value;
  });

  $deviceTmpl = $('.device').clone();
  $('.device').remove();

  $('.save').on('click', function(){
    ipcRenderer.send('saveConfig', currentProfile);
  });

  $('.new-profile').on('click', function(){
    newProfile();
  })

  $('.delete-profile').on('click', function(){
    ipcRenderer.send('deleteConfig', currentProfile.filename);
  });

  $('.refresh-profiles').on('click', function(){
    ipcRenderer.send('getProfiles');
  });
}

$(function(){
  initIPC();
  initUI();
});
