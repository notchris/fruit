import { Body, Sphere, Vec3, World } from "cannon-es";
import { Group, Scene, Vector3 } from "three";
import { GLTF } from "three/examples/jsm/Addons.js";

export default class Fruit {
  world: World;
  scene: Scene;
  group: Group;
  body: Body;
  constructor(
    world: World,
    scene: Scene,
    model: GLTF,
    size: number,
    scale: Vector3
  ) {
    this.world = world;
    this.scene = scene;

    const group = model.scene.children[0].clone(true) as Group;
    group.children.forEach((child) => (child.castShadow = true));
    this.group = group;

    this.scene.add(this.group);
    const { x, y, z } = scale;
    this.group.scale.set(x, y, z);

    const sphere = new Sphere(size);
    this.body = new Body({
      mass: 1,
      position: new Vec3(0, 4, 0),
    });
    this.body.addShape(sphere);
    this.world.addBody(this.body);
  }

  update() {
    if (!this.group || !this.body) return;
    this.group.position.copy(this.body.position);
    this.group.quaternion.copy(this.body.quaternion);
  }
}
