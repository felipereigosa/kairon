# Kairon

Kairon is a VR code editor. The idea is you never have to take the headset off but you interact with the code you see inside it with the keyboard on your computer. You can also interact with the world you generate dynamically with the headset controllers.

[![Introductory video](https://felipereigosa.com/thumbnail-yt.png)](https://www.youtube.com/watch?v=Y2uiSF48bNY)

## How to run

I only tested this on my Quest 2 and my Ubuntu as the server with the keyboard, tablet, etc, but it should work on anything that works with WebXR. To get it to work on the Quest, set it up in developer mode and connect the cable then allow usb debugging. If you want to use it wireless, find the ip of the headset with

```
adb shell ip route
```

and connect like this

```
adb tcpip 5555
adb connect <ipaddress>:5555
```

After that you have to expose a couple of ports to the headset, you can do this with

```
adb reverse tcp:8080 tcp:8080
adb reverse tcp:3000 tcp:3000
```

Now on a terminal, clone the project, install the dependencies and and run it with

```
git clone https://github.com/felipereigosa/kairon.git
cd kairon
npm ci
npm start
```

and on a separate terminal run the input window

```
npm run input
```

Now open http://localhost:8080/ on your headset browser and enter VR.

If you type on the input window or use the mouse/tablet on it it should appear in the VR editor.

## Using it

The editor works like a combination of emacs and chrome, you can create new tabs, kill tabs and move between them with the same shortcuts as in chrome and edit the contents of the current tab with emacs key bindings. Please have a look at onKeyDown function in the src/editor.js file for details but to get you started, just type something like console.log("hello world") and execute the tab with Ctrl + Shift + J. A new tab with a terminal should open with the text printed, you can switch to it and back with Ctrl + Tab.

Now to navigate the VR world, you can move with the left joystick, move up and down or rotate with the right joystick and grab objects that have the interactive flag set by sticking your hand inside it and pressing the grip button. You can speed up movement with A and toggle the visibility of the editor with B.

## Code completion with copilot

Copilot completion works but it's a bit of a hack. For now, until I can figure out json-rpc properly it uses emacs as a backend, so if you want to use it, make sure you have emacs installed and copilot is working from this project: https://github.com/zerolfx/copilot.el (make sure you log in to copilot and it works inside emacs). After that, if you are in the kairon directory (that has the copilot.el file) this should return a completion in the command line:

```
echo "[1, 2, 3, " > /tmp/code.txt
emacs --batch --eval '(load-file "copilot.el")' --eval '(complete)'
```

If that works, then you can complete code inside kairon with Ctrl + C. I told you it was a hack, I'll fix it. While it's fetching the completion the cursor will turn black. If there's no completion it will turn white back without inserting anything. It takes a while, but it should be much faster once I sort json-rpc out.

## Contributing

If you want to contribute to this repo with your own idea, create an issue with a feature request and we can discuss it, it will probably be fine, I just want the ability to veto it in case it really doesn't fit the project. If you don't like that, fork it and do your own thing, it's completely open source, I'll create an MIT licence, but you can do whatever you want with it. If you don't know what to work on but want to work on something here's a few things I want to do but haven't got around to yet:

- fix a million bugs
- fast/emacs independent copilot with javascript json-rpc
- mark regions
- copy and paste
- proper save/open mechanism (right now you can only save the whole state with Ctrl + S and load it again with Ctrl + o)
- send all the code to copilot as context for better completions (right now only the contents of the current tab is sent)
- angular velocity estimator (like the existing velocity estimator, right now throwing things looks weird)
- don't use editor.object canvas.object etc. make them inherit from THREE.Group like slider/button
- use hand input (poses) in addition to controllers (enable with key and disable when I start typing?)
- more presets, 3d versions of other 2d GUI elements
- collaboration perhaps with networked aframe
- merge the server and the input window? (I think it will mess shortcuts though) Is an online version so users can only visit a site and maybe enter a code on the browser?
- fix constant headset crashing when I change code (besides code.js)
- reorganize tabs (with shortcuts or mouse)
- look and "click" with shortcut (s for select?)
- resize editor by corners
- think about configurable VR shortcuts (point with one hand and press and drag pie menu with the other)
- shortcut to comment marked region
- text contents too big horizontally
- curved editor?
- control my computer from VR (change music volume, receive notifications, ...)
- more presets (calculator, ruler, 3d sketching, wand, flashlight, hook, ladder, gun, whip, bow and arrow, geometry extruder, saber, sphere, cube, cylinder, color picker)
- database of lowpoly objects to use temporarily (like icon packs) instead of having to go to blender to get something
- VR Swipe if you don't want to use the keyboard