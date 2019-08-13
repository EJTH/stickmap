{
  "app": "GTA5.exe",
  "axisPolling": 10,
  "deadzone": 0.05,
  "destroy": "function(robot){\r\n    clearInterval(this.wiggleTimer);\r\n  }",
  "enabled": false,
  "id": "gta_fly",
  "init": "function(robot){\n    var dir = 1;\n    var cfg = this;\n    this.wiggleOn = false;\n    this.wiggleTimer = setInterval(function(){\n      if(cfg.wiggleOn){\n        robot.moveMouseRelative(dir,dir);\n        dir *= -1;\n      }\n    }, 100);\n  }",
  "inputs": {
    "0axis0+": {
      "key": "numpad_5",
      "pwm": 50
    },
    "0axis0-": {
      "key": "numpad_8",
      "pwm": 50
    },
    "0axis1+": {
      "key": "numpad_6",
      "pwm": 50
    },
    "0axis1-": {
      "key": "numpad_4",
      "pwm": 50
    },
    "0axis2": {
      "mouseX": true,
      "scale": 25
    },
    "0axis3": {
      "mouseY": true,
      "scale": 25
    },
    "0axis4+": {
      "key": "d",
      "pwm": 50
    },
    "0axis4-": {
      "key": "a",
      "pwm": 50
    },
    "0axis5+": {
      "key": "s",
      "pwm": 100
    },
    "0axis5-": {
      "key": "w",
      "pwm": 100
    },
    "0btn0": {
      "key": "space"
    },
    "0btn1": {
      "key": "e"
    },
    "0btn10": {
      "enabler": true
    },
    "0btn2": {
      "callback": "function(robot,value){\r\n      if(value) this.wiggleOn = !this.wiggleOn;\r\n    }"
    }
  },
  "title": "GTA Flying"
}
