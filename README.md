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