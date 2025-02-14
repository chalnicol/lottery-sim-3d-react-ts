import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import gsap from "gsap";
export default class Button {
	private id: number;
	private label: string;
	private color: number;
	private textColor: number;
	private mesh: THREE.Group;
	private enabled: boolean;
	constructor(
		id: number,
		label: string,
		enabled: boolean = true,
		color: number = 0xffffff,
		textColor: number = 0x000000
	) {
		this.id = id;
		this.label = label;
		this.color = color;
		this.textColor = textColor;
		this.enabled = enabled;

		//create
		this.mesh = new THREE.Group();
		this.createButton();
		this.createLabel();
	}

	createButton() {
		// Create button geometry & material
		const buttonGeometry = new THREE.BoxGeometry(4, 0.3, 1);
		const buttonMaterial = new THREE.MeshBasicMaterial({
			color: this.enabled ? this.color : 0x9c9c9c,
		});
		const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
		this.mesh.add(buttonMesh);
	}

	createLabel(): void {
		const fontURL: string =
			"https://threejs.org/examples/fonts/helvetiker_bold.typeface.json";

		new FontLoader().load(fontURL, (font) => {
			this.createText(font);
		});
	}

	createText(font: any) {
		const labelGeometry = new TextGeometry(this.label, {
			font,
			size: 0.3,
			depth: 0.05,
		});
		const labelMaterial = new THREE.MeshBasicMaterial({
			color: this.textColor,
		});
		const label = new THREE.Mesh(labelGeometry, labelMaterial);

		labelGeometry.computeBoundingBox();
		if (labelGeometry.boundingBox) {
			const centerOffset =
				-0.5 *
				(labelGeometry.boundingBox.max.x - labelGeometry.boundingBox.min.x);
			label.position.set(centerOffset, 0.16, 0.1);
		}
		label.rotation.x = -Math.PI / 2;

		if (this.mesh.children[1]) {
			this.mesh.remove(this.mesh.children[1]);
		}

		this.mesh.add(label);
	}

	setPosition(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
		this.mesh.position.copy(position);
	}
	getMesh(): THREE.Group {
		return this.mesh;
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	enable(state: boolean = true): void {
		this.enabled = state;
		const buttonMesh = this.mesh.children[0] as THREE.Mesh;
		if (buttonMesh.material instanceof THREE.MeshBasicMaterial) {
			buttonMesh.material.color.set(state ? this.color : 0x9c9c9c);
		}
	}

	getId(): number {
		return this.id;
	}

	setLabel(label: string): void {
		this.label = label;
		this.createLabel();
	}

	setVisible(visible: boolean = true): void {
		this.mesh.visible = visible;
	}

	onClick() {
		if (!this.enabled) return;

		// const buttonMesh = this.mesh.children[0] as THREE.Mesh;
		// const buttonMaterial = buttonMesh.material as THREE.MeshBasicMaterial;

		gsap.to(this.mesh.position, {
			y: "-=0.1",
			duration: 0.1,
			yoyo: true,
			repeat: 1,
			ease: "power1.inOut",
		}); // Shrink effect
		// gsap.to(buttonMaterial.color, {
		// 	r: 1,
		// 	g: 0,
		// 	b: 0,
		// 	duration: 0.2,
		// 	yoyo: true,
		// 	repeat: 1,
		// 	ease: "power1.inOut",
		// }); // Flash red
	}
}
