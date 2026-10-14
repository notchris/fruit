import "./style.scss";

import {
  ACESFilmicToneMapping,
  AmbientLight,
  Clock,
  CubeTexture,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshPhongMaterial,
  MeshToonMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import { resizeRendererToDisplaySize } from "./helpers/responsiveness.js";
import { Body, World } from "cannon-es";
import Fruit from "./helpers/fruit.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";
import Target from "./helpers/target.js";

interface FruitObject {
  src: string;
  size: number;
  scale: Vector3;
  translate: Vector3;
  color: number;
}

const CANVAS_ID = "scene";

const modelList: Record<string, FruitObject> = {
  apple: {
    src: "Apple.glb",
    size: 1,
    scale: new Vector3(11, 11, 11),
    translate: new Vector3(0, -0.085, 0),
    color: 0xff0000,
  },
  banana: {
    size: 1.0,
    src: "Banana.glb",
    scale: new Vector3(5, 5, 5),
    translate: new Vector3(0, 0, 0),
    color: 0xffff00,
  },
  cherries: {
    size: 0.75,
    src: "Cherries.glb",
    scale: new Vector3(11, 11, 11),
    translate: new Vector3(0, 0, 0),
    color: 0xff0000,
  },
  grapes: {
    size: 1.0,
    src: "Grapes.glb",
    scale: new Vector3(11, 11, 11),
    translate: new Vector3(0, -0.1, 0),
    color: 0x800080,
  },
  orange: {
    size: 0.75,
    src: "Orange.glb",
    scale: new Vector3(11, 11, 11),
    translate: new Vector3(0, -0.08, 0),
    color: 0xffa600,
  },
  pear: {
    size: 0.75,
    src: "Pear.glb",
    scale: new Vector3(11, 11, 11),
    translate: new Vector3(0, -0.07, 0),
    color: 0x76e8a2,
  },
  pineapple: {
    size: 0.75,
    src: "Pineapple.glb",
    scale: new Vector3(11, 11, 11),
    translate: new Vector3(0, -0.07, 0),
    color: 0xffff00,
  },
  strawberry: {
    size: 0.75,
    src: "Strawberry.glb",
    scale: new Vector3(11, 11, 11),
    translate: new Vector3(0, -0.087, 0),
    color: 0xff0000,
  },
  watermelon: {
    size: 1.5,
    src: "Watermelon.glb",
    scale: new Vector3(11, 11, 11),
    translate: new Vector3(0, -0.15, 0),
    color: 0xe994a1,
  },
};

class GameScene {
  canvas: HTMLElement;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  // controls: OrbitControls;
  clock: Clock;
  meshList: Mesh[] = [];
  world: World;
  fruits: Fruit[] = [];
  modelMap: Record<string, FruitObject> = {};
  models: Record<string, GLTF> = {};

  targets: Target[] = [];
  orbit: Object3D = new Object3D();
  score = 0;
  scoreEl: Element | null;
  sounds = {
    throw: new Audio("./sfx/throw.mp3"),
    splat: [new Audio("./sfx/splat1.mp3"), new Audio("./sfx/splat2.mp3")],
    chat: new Audio("./sfx/chat.mp3"),
  };

  targetImg: Texture;
  chatImg: Texture;

  ready = false;

  bullets: { [id: string]: Mesh } = {};
  bulletBodies: { [id: string]: Body } = {};
  bulletId = 0;

  decals: Mesh[] = [];
  decalPosition: Vector3 = new Vector3();
  decalMaterial: MeshToonMaterial;

  constructor(models: Record<string, GLTF>) {
    this.models = models;

    this.scoreEl = document.querySelector("#score");

    this.sounds.throw.load();
    this.sounds.splat.forEach((s) => s.load());
    this.sounds.chat.load();

    this.targetImg = new TextureLoader().load("./target.png");
    this.chatImg = new TextureLoader().load("./chat.png");
    this.world = new World();
    this.world.gravity.set(0, -10, 0);

    this.canvas = document.querySelector(`canvas#${CANVAS_ID}`)!;
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;

    const start = document.getElementById("start");
    start?.addEventListener("click", () => {
      this.ready = true;
      start.style.display = "none";
      this.createTargets();
    });

    this.renderer.domElement.addEventListener("click", () => {
      if (!this.ready) return;
      this.shootFruit();
    });

    this.orbit.rotation.order = "YXZ"; //z should be the last axis to rotate in order...

    this.renderer.domElement.addEventListener("mousemove", (e) => {
      let scale = -0.005;
      this.orbit.rotateY(e.movementX * scale);
      this.orbit.rotateX(e.movementY * scale);
      if (this.orbit.rotation.y < -0.8) {
        this.orbit.rotation.y = -0.8;
      } else if (this.orbit.rotation.y > 0.8) {
        this.orbit.rotation.y = 0.8;
      }

      if (this.orbit.rotation.x < -0.8) {
        this.orbit.rotation.x = -0.8;
      } else if (this.orbit.rotation.x > 0.8) {
        this.orbit.rotation.x = 0.8;
      }

      this.orbit.rotation.z = 0; //this is important to keep the camera level..
    });

    this.scene = new Scene();

    this.scene.add(this.orbit);

    const tmpCubeTexture = new CubeTexture([
      new DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1),
      new DataTexture(new Uint8Array([0, 255, 0, 255]), 1, 1),
      new DataTexture(new Uint8Array([0, 0, 255, 255]), 1, 1),
      new DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1),
      new DataTexture(new Uint8Array([255, 255, 0, 255]), 1, 1),
      new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1),
    ]);
    tmpCubeTexture.needsUpdate = true;

    const decalLoader = new TextureLoader();
    const decalDiffuse = decalLoader.load("./decal-diffuse.png");
    decalDiffuse.colorSpace = SRGBColorSpace;
    const decalNormal = decalLoader.load("./decal-normal.jpg");

    this.decalMaterial = new MeshToonMaterial({
      map: decalDiffuse,
      normalMap: decalNormal,
      normalScale: new Vector2(1, 1),

      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      wireframe: false,
    });

    // Apply the above cubemap as the background, then render a blurred version
    this.scene.background = tmpCubeTexture;

    const pmremGenerator = new PMREMGenerator(this.renderer);
    const envMap = pmremGenerator.fromScene(this.scene, 0.01).texture;

    tmpCubeTexture.images.forEach((texture: any) => texture.dispose());
    tmpCubeTexture.dispose();

    // Apply the blurred render to the scene
    this.scene.background = envMap;
    this.scene.environment = envMap;

    const ambientLight = new AmbientLight(0xffffff, 0.5);
    ambientLight.position.set(0, 20, 0);
    this.scene.add(ambientLight);

    const dirLight = new DirectionalLight(0xffffff);
    dirLight.position.set(3, 10, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = -2;
    dirLight.shadow.camera.left = -2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    this.scene.add(dirLight);

    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      100
    );
    this.camera.position.set(0, 1, 5);

    let cameraDistance = 5;
    this.camera.position.z = cameraDistance;
    this.orbit.add(this.camera);

    this.clock = new Clock();

    this.init();
  }

  init() {
    this.animate();
  }

  randomSplat() {
    const splat =
      this.sounds.splat[Math.floor(Math.random() * this.sounds.splat.length)];
    splat.play();
  }

  addFruit(name: keyof typeof modelList) {
    const fruitModel = this.models[name];
    const fruitScale = modelList[name].scale;
    const fruitSize = modelList[name].size;
    return new Fruit(this.world, this.scene, fruitModel, fruitSize, fruitScale);
  }

  getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }

  createTargets() {
    let duration = 4000;
    let delay = 1000;
    let shootTarget = new MeshPhongMaterial({
      side: DoubleSide,
      map: this.targetImg,
    });
    let chat = new MeshPhongMaterial({
      side: DoubleSide,
      map: this.chatImg,
    });
    for (let i = 0; i < 50; i += 1) {
      let d = Math.random();
      let isChat = d > 0.7;

      const target = new Target(
        this.world,
        this.scene,
        new Vector3(
          -40,
          this.getRandomInt(-10, 10),
          this.getRandomInt(-20, -30)
        ),
        isChat,
        isChat ? chat : shootTarget
      );
      target.addTween({ x: 40 }, duration, i * delay);
      this.targets.push(target);
      target.tween?.start();

      if (i === 49) {
        if (!target || !target.tween) return;
        target.tween.onComplete(() => {
          setTimeout(() => {
            const replay = confirm("Play again?");
            if (replay) {
              window.location.reload();
            }
          }, 3000);
        });
      }
    }
  }

  animate() {
    requestAnimationFrame(() => {
      this.animate();
    });

    this.world.fixedStep();

    if (this.fruits.length) {
      this.fruits.forEach((fruit) => fruit.update());
    }
    if (this.targets.length) {
      this.targets.forEach((target) => target.update());
    }

    if (resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);
  }

  penalty() {
    this.score -= 1;
    if (!this.scoreEl) return;
    this.scoreEl.innerHTML = `Score: ${this.score}`;
  }

  setScore() {
    this.score += 1;
    if (!this.scoreEl) return;
    this.scoreEl.innerHTML = `Score: ${this.score}`;
  }

  shootFruit() {
    this.sounds.throw.play();
    const fruitList = Object.keys(modelList);
    const rndFruit = fruitList[Math.floor(Math.random() * fruitList.length)];

    const fruit = this.addFruit(rndFruit);
    this.fruits.push(fruit);
    const { x, y, z } = this.camera.position;
    fruit.body.position.set(x, y, z);

    fruit.body.addEventListener("collide", (e: any) => {
      this.targets.forEach((target) => {
        if (target.body === e.body) {
          console.log(target);
          const { x, y, z } = fruit.body.position;
          const vec = new Vector3(x, y, z);

          const pos = target.mesh.worldToLocal(vec);

          target.addSplat(
            this.decalMaterial,
            modelList[rndFruit].color,
            new Vector3(pos.x, pos.y, pos.z - 1)
          );
          this.randomSplat();
          if (target.isChat) {
            this.penalty();
          } else {
            this.setScore();
          }
        }
      });
    });

    const v = new Vector3(0, 0, -1);
    v.applyQuaternion(this.orbit.quaternion);

    v.multiplyScalar(50);
    fruit.body.velocity.set(v.x, v.y, v.z);
    fruit.body.angularVelocity.set(
      Math.random() * 10 + 1,
      Math.random() * 10 + 1,
      Math.random() * 10 + 1
    );

    setTimeout(() => {
      this.scene.remove(fruit.group);
      this.world.removeBody(fruit.body);
      const idx = this.fruits.indexOf(fruit);
      this.fruits.splice(idx, 1);
    }, 2000);
  }
}

async function loadModel(url: string): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (error) => reject(error)
    );
  });
}

async function resolveAllModels(
  models: Record<string, Promise<GLTF>>
): Promise<Record<string, GLTF>> {
  const resolvedModels: Record<string, GLTF> = {};

  for (const [key, promise] of Object.entries(models)) {
    try {
      resolvedModels[key] = await promise;
    } catch (error) {
      console.error(`Error loading model ${key}:`, error);
    }
  }

  return resolvedModels;
}

async function startGame() {

  // Load all the models
  const gltfPromises: Record<string, Promise<GLTF>> = {};
  Object.keys(modelList).forEach((model) => {
    gltfPromises[model] = loadModel(`./models/${modelList[model].src}`);
  });

  try {
    const models = await resolveAllModels(gltfPromises);
    Object.keys(models).forEach((key) => {
      const model = models[key];
      const translate = modelList[key].translate;
      const group = model.scene.children[0];
      group.children.forEach((child) => {
        if (child instanceof Mesh) {
          const { x, y, z } = translate;
          child.geometry.translate(x, y, z);
        }
      });
    });
    new GameScene(models);
  } catch (error) {
    console.error("Error loading models:", error);
  }
}

startGame();
