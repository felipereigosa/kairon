import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry';
import { VRButton } from 'three/addons/webxr/VRButton';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { VelocityEstimator } from "./velocity";
import * as util from './util';
import { run } from './code';
import { Editor } from './editor';

let renderer;
let entered;
let timeSinceUpdate = 0;

const buttonNames = ["trigger", "grab", "", "thumbstick", "x", "y", ""];
let oldState = {left: {buttons: [0, 0, 0, 0, 0, 0, 0], axes: [0, 0]},
                right: {buttons: [0, 0, 0, 0, 0, 0, 0], axes: [0, 0]}};

function getAxes (hand) {
  return oldState[hand].axes;
}

function pollControllers () {
  const session = renderer.xr.getSession();
  if (session) {
    for (const source of session.inputSources) {
      if (source.gamepad) {
        const controller = avatar.controllers[source.handedness];
        if (!controller.actuator) {
          controller.actuator = source.gamepad.hapticActuators[0];
        }
        const buttons = source.gamepad.buttons.map((b) => b.value);
        for (let i = 0; i < 7; i++) {
          if (buttons[i] > 0.5 && oldState[source.handedness].buttons[i] < 0.5) {
            try {
              buttonPressed(source.handedness, buttonNames[i]);
            }
            catch (error) {
              console.log(`input error ${error}`);
            }
          }
          else if (buttons[i] === 0 &&
                   oldState[source.handedness].buttons[i] !== 0) {
            try {
              buttonReleased(source.handedness, buttonNames[i]);
            }
            catch (error) {
              console.log(`input error ${error}`);
            }
          }
        }
        oldState[source.handedness].buttons = [...buttons];
        oldState[source.handedness].axes = source.gamepad.axes.slice(2);
      }
    }
  }
}

function pulse (hand, strength, duration) {
  avatar.controllers[hand].actuator.pulse(strength, duration);
}

function createStaticBody (x, y, z, hw, hh, hd) {
  const shape = new CANNON.Box(new CANNON.Vec3(hw, hh, hd));
  const body = new CANNON.Body({mass: 0});
  body.addShape(shape);
  body.position.set(x, y, z);
  physics.addBody(body);
}

function playAction (object, actionName, timeScale) {
  const mixer = object.mixer;
  const clip = THREE.AnimationClip.findByName(object.clips, actionName);
  const action = mixer.clipAction(clip, object);
  mixer.stopAllAction();
  action.reset();
  action.timeScale = timeScale;
  action.loop = THREE.LoopOnce;
  action.clampWhenFinished = true;
  action.play();
}

function createEnvironment () {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(1, 1.75, 0);
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 4096 * 4;
  dirLight.shadow.mapSize.height = 4096 * 4;
  const d = 6;
  dirLight.shadow.camera.left = - d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.far = 500;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12),
                                new THREE.MeshLambertMaterial({color: 0xaaaaaa}));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const room = new THREE.LineSegments(
    new BoxLineGeometry(12, 12, 12, 20, 20, 20),
    new THREE.LineBasicMaterial({color: 0x808080})
  );
  room.geometry.translate(0, 6.001, 0);
  scene.add(room);

  const vertexShader = `varying vec3 vWorldPosition;
                        void main() {
                          vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                          vWorldPosition = worldPosition.xyz;
                          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                        }`;

  const fragmentShader = `uniform vec3 topColor;
                          uniform vec3 bottomColor;
                          uniform float offset;
                          uniform float exponent;
                          varying vec3 vWorldPosition;
                          void main() {
                            float h = normalize( vWorldPosition + offset ).y;
                            gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( h, exponent ), 0.0 ) ), 1.0 );
                          }`;

  const c = new THREE.Color(0xffffff);
  c.setHSL(0.6, 1, 0.6);
  const uniforms = {
    'topColor': {value: c},
    'bottomColor': {value: new THREE.Color(0xffffff)},
    'offset': {value: 500},
    'exponent': {value: 0.6}
  };

  const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide
  });

  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  createStaticBody(0, -0.1, 0, 6, 0.1, 6);
  createStaticBody(0, 6, -6.1, 6, 6, 0.1);
  createStaticBody(0, 6, 6.1, 6, 6, 0.1);
  createStaticBody(-6.1, 6, 0, 0.1, 6, 6);
  createStaticBody(6.1, 6, 0, 0.1, 6, 6);
}

function constrainAvatar () {
  avatar.position.x = util.within(avatar.position.x, -5.5, 5.5);
  avatar.position.z = util.within(avatar.position.z, -5.5, 5.5);
  avatar.position.y = util.within(avatar.position.y, -0.5, 11.5);
}

function init () {
  try {
    entered = false;
    window.scene = new THREE.Scene();
    scene.background = new THREE.Color().setHSL(0.6, 0, 1);
    window.avatar = new THREE.Group();
    avatar.clock = new THREE.Clock();
    const width = window.innerWidth;
    const height = window.innerHeight;
    window.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 5000);
    camera.position.set(0.3, 1, 0.3);

    avatar.add(camera);
    avatar.controllers = {};
    avatar.speed = 0.015;
    scene.add(avatar);

    window.physics = new CANNON.World();
    physics.gravity.set(0, -9.82, 0);
    physics.allowSleep = true;

    createEnvironment();

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    renderer.xr.addEventListener('sessionstart', () => {
      entered = true;
    });
    renderer.localClippingEnabled = true;

    document.body.appendChild(VRButton.createButton(renderer));

    const leftController = renderer.xr.getControllerGrip(0);
    leftController.name = 'left_controller';
    leftController.velocityEstimator = new VelocityEstimator();
    avatar.add(leftController);
    avatar.controllers['left'] = leftController;

    const rightController = renderer.xr.getControllerGrip(1);
    rightController.name = 'right_controller';
    rightController.velocityEstimator = new VelocityEstimator();
    avatar.add(rightController);
    avatar.controllers['right'] = rightController;

    const loader = new GLTFLoader();

    loader.load("hand.glb",
                function (gltf) {
                  const rightHand = gltf.scene;
                  rightHand.name = 'right_hand';
                  rightController.add(rightHand);
                  rightHand.clips = gltf.animations;
                  rightHand.mixer = new THREE.AnimationMixer(gltf.scene);
                  rightHand.scale.set(0.95, 0.95, 0.95);

                  rightHand.traverse(function (child) {
                    if (child.isMesh) {
                      child.castShadow = true;
                    }
                  });

                  const leftHand = util.clone(rightHand);
                  leftHand.name = 'left_hand';
                  leftHand.scale.set(-0.95, 0.95, 0.95);
                  leftHand.clips = gltf.animations;
                  leftHand.mixer = new THREE.AnimationMixer(gltf.scene);
                  leftController.add(leftHand);

                  renderer.setAnimationLoop(render);
                });

    window.editor = new Editor();
    editor.object.scale.set(0.2, 0.2, 0.2);
    scene.add(editor.object);
    editor.show();

    scene.traverse(function (child) {
      child.background = true;
    });
  }
  catch (error) {
    console.log(`init error ${error}`);
  }
}

function move () {
  const direction = new THREE.Vector3();
  const [lx, lz] = getAxes("left");
  direction.set(lx, 0, lz);

  if (direction.length() > 0.1) {
    direction.applyEuler(camera.rotation);
    direction.applyEuler(avatar.rotation);
    direction.y = 0;

    direction.normalize();
    direction.multiplyScalar(avatar.speed);
    avatar.position.add(direction);
  }
  avatar.position.y += -getAxes("right")[1] * avatar.speed;
  constrainAvatar();
}

let thumb = false;
function turn () {
  const value = getAxes("right")[0];
  const angleSize = util.toRadians(45);
  if (value > 0.9 && !thumb) {
    thumb = true;
    avatar.rotation.y -= angleSize;
  }
  else if (value < -0.9 && !thumb) {
    thumb = true;
    avatar.rotation.y += angleSize;
  }
  else if (value === 0) {
    thumb = false;
  }
}

function isInsideObject (object, position) {
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3(1, 0, 0);
  object.updateMatrixWorld();
  raycaster.set(position, direction);
  object.material.side = THREE.DoubleSide;
  return (raycaster.intersectObject(object).length % 2) === 1;
}

function getObjectAt (position) {
  let result = null;
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.interactive) {
      if (isInsideObject(object, position)) {
        if (object.name === "collision") {
          result = object.parent;
        }
        else {
          result = object;
        }
        return;
      }
    }
  });
  return result;
}

function buttonPressed (hand, button) {
  const controller = avatar.controllers[hand];
  const otherHand = hand === "left" ? "right" : "left";
  const otherController = avatar.controllers[otherHand];
  const position = new THREE.Vector3();
  const handMesh = avatar.getObjectByName(`${hand}_hand`);

  if (button === "grab") {
    playAction(handMesh, "close", 3);

    controller.getWorldPosition(position);
    const object = getObjectAt(position);

    if (object) {
      window.last_held = object;
      controller.held = object;

      if (object.grabbed) {
        object.grabbed(hand);
      }
      else  {
        if (object === otherController.held) {
          otherController.held = null;
        }
        controller.add(object);

        const relativeTransform =
              new THREE.Matrix4()
              .copy(controller.matrixWorld)
              .invert()
              .multiply(object.matrixWorld);

        relativeTransform.decompose(object.position,
                                    object.quaternion,
                                    object.scale);
        pulse(hand, 1, 50);
        if (object.body) {
          object.body.wakeUp();
        }
      }
    }
  }
  else if (button === "x" ) {
    avatar.speed = 0.03;
  }
}

function buttonReleased (hand, button) {
  const controller = avatar.controllers[hand];
  const velocity = new THREE.Vector3();
  const handMesh = avatar.getObjectByName(`${hand}_hand`);

  if (button === "grab") {
    playAction(handMesh, "open", 3);

    const held = controller.held;

    if (held) {
      if (held.released) {
        held.released(hand);
      }
      else {
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        held.getWorldPosition(position);
        held.getWorldQuaternion(quaternion);
        scene.add(held);
        held.position.copy(position);
        held.quaternion.copy(quaternion);

        if (held.body) {
          held.body.position.copy(held.position);
          held.body.quaternion.copy(held.quaternion);
          velocity.set(...controller.velocityEstimator.getVelocity());
          velocity.multiplyScalar(120);
          held.body.velocity.set(velocity.x, velocity.y, velocity.z);
          held.body.angularVelocity.set(0, 0, 0);
          held.body.wakeUp();
        }
        controller.held = null;
      }
    }
  }
  else if (button === "x" ) {
    avatar.speed = 0.015;
  }
  else if (button === "y") {
    editor.toggleVisibility();
  }
}

const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();

function render () {
  if (timeSinceUpdate < 5000 || entered) {
    try {
      renderer.render(scene, camera);
      const delta = avatar.clock.getDelta();
      timeSinceUpdate += delta * 1000;

      if (entered) {
        physics.fixedStep();
        pollControllers();
        move();
        turn();

        scene.traverse((child) => {
          if (child.update) {
            child.update();
          }
        });

        const rightHand = scene.getObjectByName("right_hand");
        rightHand.mixer.update(delta);
        const leftHand = scene.getObjectByName("left_hand");
        leftHand.mixer.update(delta);

        const left = avatar.controllers.left;
        const right = avatar.controllers.right;
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh &&
              object.body) {
            if (object.parent === left || object.parent === right) {
              object.getWorldPosition(position);
              object.getWorldQuaternion(quaternion);
              object.parent.velocityEstimator.recordPosition(position);
            }
            else {
              object.position.copy(object.body.position);
              object.quaternion.copy(object.body.quaternion);
            }
          }
        });
      }
    }
    catch (error) {
      console.log(`render error ${error}`);
    }
  }
}

init();

const source = new EventSource('http://localhost:3000/events');
source.onmessage = function(event) {
  timeSinceUpdate = 0;
  const data = JSON.parse(event.data);
  editor.onKeyDown(data);

  if (data.type === 'pointerdown') {
    editor.onPointerDown(data);
  }
  else if (data.type === 'pointerup') {
    editor.onPointerUp(data);
  }
  else if (data.type === 'pointermove') {
    editor.onPointerMove(data);
  }
  else if (data.type === 'keydown') {
    editor.onKeyDown(data);
  }
  else if (data.type === 'resize') {
    editor.onResize(data);
  }
};

source.onerror = function(error) {
  source.close();
};

module.hot.accept('./code', function () {
  editor.handleOutput(util.getOutput(run));
});
