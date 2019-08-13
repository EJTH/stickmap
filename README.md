# StickMap - Joystick and gamepad remapper with analog emulation
There is plenty of programs out there that can map Joystick movements to keyboard and mouse input. But in my search for a way to play GTA online with a flight stick I found none where you could easily emulate the analog advantage of a joystick comparred to keypresses. It was purely digital conversion on the 3-5 different programs I tried, some you could get away with a complicated setup of zones and macros. Others required quite a bit of scripting and knowledge (Autohotkey). Thats why I set out to make my own small tool to map a joystick to GTA Online and other games, with analog emulation through PWM (Pulse Width Modulation, ie. constantly wiggle keys to achieve analog control). My own personal tool then got a UI and now I am releasing it to the wild. Hoping it can help others.


## Features
- Easy to use interface for configuring game profiles.
- Automatically change profile dependent on active window / app.
- Map joystick and gamepad axis movement and button presses into keyboard, mouse and much more.
- Bind custom JavaScript to axis & buttons for macros and advanced usecases. Fully customizable!
- Emulate analog input through Pulse Width Modulation.
- Simple profile file structure (js based).
- Crossplatform! (Windows, OSX, Linux).

## Installing
  Either download the appropriate precompiled [builds](builds/) for your OS, or build it yourself.

## Building
  To build this project run the following commands in a shell (requires git+node&npm)
     ```
     git clone https://github.com/EJTH/stickmap # Checkout repo
     npm install # Install dependencies
     npm run build # Build project
     ```

## Help & Documentation
  All this might seem a little complicated at first glance, but its really not. Checkout the [documentation](docs/) if you have trouble.
