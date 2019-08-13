{
  "axisPolling": "80",
  "deadzone": 0.05,
  "default": true,
  "enabled": true,
  "id": "desktop_mouse",
  "inputs": {
    "0axis0": {
      "mouseY": true,
      "polling": 10,
      "scale": 25
    },
    "0axis1": {
      "mouseX": true,
      "polling": 10,
      "scale": 25
    },
    "0btn0": {
      "click": "left"
    },
    "0btn1": {
      "click": "middle"
    },
    "0btn5": {
      "callback": "function myScript(robot, value){\n  log('callback', value);\n}",
      "polling": 0
    }
  }
}