function InputConfigurator(){
  var $modal = $('.overlay');
  var $contents = $('.overlay .modal');

  var codeTranslations = {
    "ShiftLeft" : "shift",
    "ShiftRight" : "right_shift",
    "ArrowLeft" : "left",
    "ArrowRight" : "right",
    "ArrowUp" : "up",
    "ArrowDown" : "down",
    "Numpad0" : 'numpad_0',
    "Numpad1" : 'numpad_1',
    "Numpad2" : 'numpad_2',
    "Numpad3" : 'numpad_3',
    "Numpad4" : 'numpad_4',
    "Numpad5" : 'numpad_5',
    "Numpad6" : 'numpad_6',
    "Numpad7" : 'numpad_7',
    "Numpad8" : 'numpad_8',
    "Numpad9" : 'numpad_9',
    "Space"   : "space"
  }

  var tasks = [{
      name: 'Keyboard Input',
      vars: ['key', 'pwm'],
      html: '<button class="key-preview">Press a key</button><label>PWM <input type="range" class="pwm" min="0" max="500" /><span></span></label><button class="ok">Ok</button>',
      init: function(dom, cfg, done){
        var key = cfg.key;
        var pwm = 0;
        if(key) dom.find('.key-preview').text(key);
        if(cfg.pwm) pwm = cfg.pwm;

        dom.find('.pwm').val(pwm);
        dom.find('.pwm').trigger('input');

        function keyDownListener(ev){
          key = codeTranslations[ev.originalEvent.code] ? codeTranslations[ev.originalEvent.code] : ev.key.toLowerCase();
          dom.find('.key-preview').text(key);
        }

        $('html,body').on('keydown', keyDownListener);

        dom.find('.ok').on('click', function(){
          done({
            key: key,
            pwm: parseInt(dom.find('.pwm').val())
          });
          $('html,body').off('keydown', keyDownListener);
        });
      }
    },
    {
      name: 'Mouse Move',
      vars: ['mouseX', 'mouseY'],
      html: `<label><input type="radio" class="mousex" value="X" name="mouseaxis" /> X</label>
             <label><input type="radio" class="mousey" value="X" name="mouseaxis" /> Y</label>
             <label>Scale</label><input class="scale" type="number" /></label>
             <label>Polling <input type="range" class="polling" min="10" max="500" /><span></span></label>
             <button class="ok">Ok</button>`,
      init: function(dom, cfg, done){
        var scale = 1;
        var polling = 50;
        if(cfg.mouseX) dom.find('.mousex').prop('checked', true);
        if(cfg.mouseY) dom.find('.mousey').prop('checked', true);
        if(cfg.scale) scale = cfg.scale;
        if(cfg.polling) polling = cfg.polling;

        dom.find('.scale').val(scale);

        dom.find('.ok').on('click',ev => {
          var ncfg = {};
          if(dom.find('.mousey').prop('checked')) ncfg.mouseY = true;
          else ncfg.mouseX = true;
          ncfg.polling = parseInt(dom.find('.polling').val());
          ncfg.scale = parseInt(dom.find('.scale').val());
          done(ncfg);
        });

      }
    },
    {
      name: 'Mouse Click',
      vars: ['click'],
      html: `<select class="mouse-btn">
        <option>left</option>
        <option>middle</option>
        <option>right</option>
      </select><button class="ok">Ok</button>`,
      init: function(dom, cfg, done){
        if(cfg.click) dom.find('select').val(cfg.click);
        dom.find('.ok').on('click', function(){
          done({
            click: dom.find('select').val()
          });
        });
      }
    },
    {
      name: 'Set Active Profile',
      vars: ['setActiveConfig'],
      html: '<select class="profile-select"></select><button class="ok">Ok</button>',
      init: function(dom, cfg, done){
        dom.find('select').append($('#profileSelect').children().clone());
        if(cfg.setActiveConfig) dom.find('select').val(cfg.setActiveConfig);
        dom.find('.ok').on('click', function(){
          done({
            setActiveConfig: dom.find('select').val()
          });
        });
      }
    },
    {
      name: 'Script',
      vars: ['callback'],
      html: '<div class="editor-area"></div><label>Polling <input type="range" class="polling" min="0" max="500" value="0" /><span></span></label><button class="ok">Ok</button>',
      init: function(dom, cfg, done){
        var editorArea = dom.find('.editor-area')[0];

        //Script Editor
        var scriptEditor = CodeMirror(editorArea, {
          value: cfg.callback || "function myScript(robot, value){\n}",
          mode:  "javascript"
        });
        var polling = cfg.polling || 0;
        dom.find('.polling').val(polling)
        dom.find('.ok').on('click', function(){
          done({
            callback: scriptEditor.getValue(),
            polling: parseInt(dom.find('.polling').val())
          });
        });
      }
    },
    {
      name: 'Toggle enable',
      vars: ['enabler'],
      html: '',
      init: function(dom, cfg, done){
        done({enabler:true});
      }
    },
    {
      name: 'Nothing',
      html: '',
      init: function(dom, cfg, done){
        done({});
      }
    },
    {
      name: 'Cancel',
      html: '',
      init: function(dom, cfg, done){
        done(cfg);
      }
    }
  ];

  this.configure = function(axisId, cfg, cb){
    cfg = cfg || {};
    $modal.show();
    var $menu = $('<div>', {class: 'vertical-fuse'});
    tasks.forEach(task => {
      var $button = $('<button>', {text:task.name});

      if(task.vars){
        var cfgKeys = Object.keys(cfg);
        task.vars.forEach(v=>{
          if(cfgKeys.indexOf(v) > -1) $button.addClass('active');
        });
      }

      $button.on('click', function(){
        $contents.html(task.html);
        task.init($contents, cfg, function done(val){
          cb(val);
          $contents.empty();
          $modal.hide();
        });
      });
      $menu.append($button);
    });
    $contents.append($menu);
  }
}
