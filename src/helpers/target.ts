import { Body, Box, Vec3, World } from "cannon-es";
import {
  Mesh,
  MeshPhongMaterial,
  MeshToonMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
  Vector3,
} from "three";

import { Tween, Easing, update as tweenUpdate } from "@tweenjs/tween.js";

export type VecProp = {
  x?: number;
  y?: number;
  z?: number;
};

export default class Target {
  world: World;
  scene: Scene;
  mesh: Mesh;
  body: Body;
  group: Object3D;
  tween?: Tween<VecProp>;
  decals: Mesh[] = [];
  isChat: boolean;
  constructor(
    world: World,
    scene: Scene,
    start: Vector3,
    isChat: boolean,
    mat: MeshPhongMaterial
  ) {
    this.world = world;
    this.scene = scene;

    this.isChat = isChat;

    this.group = new Object3D();

    const targetGeo = new PlaneGeometry(8, 8, 8, 8);

    this.mesh = new Mesh(targetGeo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.visible = false;

    this.group.add(this.mesh);
    this.scene.add(this.group);

    const targetShape = new Box(new Vec3(4, 4, 1));
    this.body = new Body({ mass: 0 });
    this.body.addShape(targetShape);
    this.body.quaternion.setFromEuler(0, 0, 0);
    this.body.position.set(start.x, start.y, start.z);
    this.world.addBody(this.body);
  }

  addTween(to: VecProp, duration: number, delay: number) {
    const temp = this.body.position.clone();
    this.tween = new Tween(temp)
      .to(to, duration)
      .easing(Easing.Linear.None)
      .delay(delay)
      .onStart(() => {
        this.mesh.visible = true;
      })
      .onUpdate((position) => {
        const { x, y, z } = position;
        this.body.position.set(x, y, z);
      })
      .onComplete(() => {
        this.scene.remove(this.group);
        this.world.removeBody(this.body);
        this.scene.remove(...this.decals);
      });
    return this.tween;
  }

  getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // todo, move because i use this elsewhere
  }

  addSplat(material: MeshToonMaterial, color: number, position: Vector3) {
    const mat = material.clone();
    mat.color.setHex(color);
    const s = this.getRandomInt(1, 5);
    const m = new Mesh(new PlaneGeometry(s, s, 1), mat);

    this.decals.push(m);
    this.group.add(m);
    this.scene.add(m);

    m.position.x = position.x;
    m.position.y = position.y;
    m.geometry.translate(0, 1, 0);

    this.mesh.add(m);

    m.renderOrder = this.decals.length; // give decals a fixed render order
  }

  update() {
    if (!this.mesh || !this.body) return;
    tweenUpdate();

    const { x, y, z } = this.body.position;
    this.group.position.set(x, y, z);
    this.group.quaternion.copy(this.body.quaternion);
  }
}
