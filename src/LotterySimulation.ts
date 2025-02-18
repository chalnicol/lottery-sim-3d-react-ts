import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import Button from "./js/Button.ts";

interface Games {
	id: number;
	label: string;
	value: number;
	schedule: number[];
}

gsap.registerPlugin(MotionPathPlugin);

export default class LotterySimulation {
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private controls: OrbitControls;
	private world: CANNON.World;
	private raycaster: THREE.Raycaster;
	private mouse: THREE.Vector2;
	private buttons: Button[] = [];
	private balls: THREE.Group[] = [];
	private ballBodies: CANNON.Body[] = [];
	private drawnBalls: THREE.Group[] = [];
	private totalBalls: number = 42;
	private width = 7;
	private height = 9;
	private depth = 7;
	private isDrawing: boolean = false;
	private drawInterval: number = 5; //seconds
	private maxDrawCount: number = 6;
	private blinkTimer: number | undefined;
	private timerPlanes: THREE.Mesh[] = [];
	private totalPlanes = 30; // Number of planes
	// private fontURL: string =
	// 	"https://threejs.org/examples/fonts/helvetiker_bold.typeface.json";
	private fontURL: string = "/fonts/myFont.json";

	private gamesData: Games[] = [
		{ id: 0, label: "Lotto", value: 42, schedule: [2, 4, 6] },
		{ id: 1, label: "Mega Lotto", value: 45, schedule: [1, 3, 5] },
		{ id: 2, label: "Super Lotto", value: 49, schedule: [0, 2, 4] },
		{ id: 3, label: "Grand Lotto", value: 55, schedule: [1, 3, 6] },
		{ id: 4, label: "Ultra Lotto", value: 58, schedule: [0, 2, 5] },
	];

	private selects: THREE.Group[] = [];
	private selectPanelGroup: THREE.Group[] = [];
	private schedulePanelGroup: THREE.Group[] = [];

	constructor(canvas: HTMLCanvasElement) {
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(this.renderer.domElement);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		this.world = new CANNON.World();
		this.world.gravity.set(0, -9.8, 0);

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		this.initScene();
	}

	private setupControls() {
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.enableZoom = true;
		this.controls.zoomSpeed = 1.2;
		this.controls.minPolarAngle = Math.PI / 4;
		this.controls.maxPolarAngle = Math.PI / 1.9;
		this.controls.minAzimuthAngle = -Math.PI / 2;
		this.controls.maxAzimuthAngle = Math.PI / 2;
	}

	private initScene() {
		this.createLighting();
		this.createContainer();
		this.createDisplayBox();
		this.createButtons();
		this.createBalls();
		this.createTimerIndicators();
		this.setupControls();

		this.camera.position.set(4, 6, 16);

		this.setupEventListeners();
		this.animate();

		setTimeout(() => {
			this.createSelectGamePanel();
			this.startLightingEffect();
		}, 1000);
		setTimeout(() => {
			this.createSchedule();
			this.createFireworks(3);
		}, 1500);
	}

	private getSchedule(): { label: string; value: number }[][] {
		const schedule: { label: string; value: number }[][] = [];

		for (let i = 0; i < 7; i++) {
			schedule[i] = []; // Initialize each day as an empty array

			for (let j = 0; j < this.gamesData.length; j++) {
				if (this.gamesData[j].schedule.includes(i)) {
					schedule[i].push({
						label: this.gamesData[j].label,
						value: this.gamesData[j].value,
					});
				}
			}
		}
		return schedule;
	}

	private createSchedule() {
		// console.log(this.getSchedule());
		const days: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

		const panelW = 11;
		const panelH = 5.5;
		const panelD = 0.05;
		const panelSpacing = 0.1;

		const gap = 1.5;
		const day = new Date().getDay();

		const subPanelW = (panelW + panelSpacing) / 7 - panelSpacing;

		const schedule = this.getSchedule();
		new FontLoader().load(this.fontURL, (font) => {
			const titleGroup = new THREE.Group();
			//create title..
			const titleGeometry = new THREE.BoxGeometry(panelW, 1.2, 0.05);
			const titleMaterial = new THREE.MeshBasicMaterial({
				color: 0xff3333,
				transparent: true,
				opacity: 0.7,
				side: THREE.DoubleSide,
			});
			const title = new THREE.Mesh(titleGeometry, titleMaterial);

			//create title text..
			const titleTextGeometry = new TextGeometry("PCSO Lotto Schedule", {
				font,
				size: 0.35,
				depth: 0,
			});
			const titleTextMaterial = new THREE.MeshBasicMaterial({
				color: 0xfefefe,
			});
			const titleText = new THREE.Mesh(titleTextGeometry, titleTextMaterial);
			titleText.position.z = 0.05;
			titleText.position.y = -0.15;
			titleText.position.x = -panelW / 2 + 0.5;

			titleGroup.add(title, titleText);
			titleGroup.position.x = -this.width / 2 - panelW / 2 - gap;
			titleGroup.position.y = this.height / 2 + 0.2;

			this.scene.add(titleGroup);
			this.schedulePanelGroup.push(titleGroup);

			schedule.forEach((innerSched, i) => {
				const schedGroup = new THREE.Group();

				const containerGeometry = new RoundedBoxGeometry(
					subPanelW,
					panelH,
					panelD,
					5,
					0.5
				);
				const containerMaterial = new THREE.MeshBasicMaterial({
					color: day == i ? 0xb3ffff : 0xffffff,
					transparent: true,
					opacity: 0.7,
					// depthWrite: false,
					side: THREE.DoubleSide,
				});
				const container = new THREE.Mesh(
					containerGeometry,
					containerMaterial
				);

				const dayTextGeometry = new TextGeometry(days[i], {
					font,
					size: 0.3,
					depth: 0,
				});
				const dayTextMaterial = new THREE.MeshBasicMaterial({
					color: 0x3a3a3a,
				});
				const dayText = new THREE.Mesh(dayTextGeometry, dayTextMaterial);

				dayTextGeometry.computeBoundingBox();
				if (dayTextGeometry.boundingBox) {
					const centerOffset =
						-0.5 *
						(dayTextGeometry.boundingBox.max.x -
							dayTextGeometry.boundingBox.min.x);
					dayText.position.set(centerOffset, 0.16, 0.1);
				}

				dayText.position.z = 0.05;
				dayText.position.y = panelH / 2 - 0.7;

				const xPos =
					-this.width / 2 -
					panelW -
					gap +
					subPanelW / 2 +
					i * (subPanelW + panelSpacing);

				schedGroup.add(container, dayText);
				schedGroup.position.set(xPos, this.height / 2 - 3.4, 0);

				this.scene.add(schedGroup);
				this.schedulePanelGroup.push(schedGroup);

				gsap.from(schedGroup.rotation, {
					y: Math.PI / 2,
					ease: "power1.out",
					duration: 0.2,
					delay: i * 0.06,
				});

				innerSched.forEach((game, j) => {
					const gameGroup = new THREE.Group();

					const squareGeometry = new THREE.PlaneGeometry(
						subPanelW * 0.8,
						subPanelW * 0.8
					);
					const squareMaterial = new THREE.MeshBasicMaterial({
						color: 0x3f3f3f,
					});
					const square = new THREE.Mesh(squareGeometry, squareMaterial);
					square.position.z = 0.06;

					const txt = `6/${game.value}`;
					const gameTextGeometry = new TextGeometry(txt, {
						font,
						size: 0.28,
						depth: 0,
					});
					const gameTextMaterial = new THREE.MeshBasicMaterial({
						color: 0xfefefe,
					});
					const gameText = new THREE.Mesh(
						gameTextGeometry,
						gameTextMaterial
					);

					gameTextGeometry.computeBoundingBox();
					if (gameTextGeometry.boundingBox) {
						const centerOffset =
							-0.5 *
							(gameTextGeometry.boundingBox.max.x -
								gameTextGeometry.boundingBox.min.x);
						gameText.position.set(centerOffset, 0.16, 0.1);
					}
					gameText.position.z = 0.07;
					gameText.position.y = -0.1;

					gameGroup.add(square, gameText);

					gameGroup.position.set(0, -j * 1.4 + 1.1, 0);

					schedGroup.add(gameGroup);
				});
			});
		});
	}

	private createLighting() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
		this.scene.add(ambientLight);
		const pointLight = new THREE.PointLight(0xffffff, 3);
		pointLight.position.set(5, 5, 5);
		this.scene.add(pointLight);
	}

	private createContainer() {
		const wallData = [
			// Floor and Ceiling (adjusted width and depth)
			{
				position: [0, -this.height / 2, 0],
				rotation: [-Math.PI / 2, 0, 0],
				size: [this.width, this.depth],
			}, // Floor
			{
				position: [0, this.height / 2, 0],
				rotation: [Math.PI / 2, 0, 0],
				size: [this.width, this.depth],
			}, // Ceiling

			// Left, Right, Front, Back (adjusted height but consistent width/depth)
			{
				position: [-this.width / 2, 0, 0],
				rotation: [0, Math.PI / 2, 0],
				size: [this.width, this.height],
			}, // Left
			{
				position: [this.width / 2, 0, 0],
				rotation: [0, -Math.PI / 2, 0],
				size: [this.width, this.height],
			}, // Right
			{
				position: [0, 0, -this.depth / 2],
				rotation: [0, 0, 0],
				size: [this.width, this.height],
			}, // Back
			{
				position: [0, 0, this.depth / 2],
				rotation: [0, Math.PI, 0],
				size: [this.width, this.height],
			}, // Front
		];

		wallData.forEach((wall) => {
			// Add Cannon.js physics body for each wall
			const wallShape = new CANNON.Plane();
			const wallBody = new CANNON.Body({ mass: 0 }); // Static wall
			wallBody.addShape(wallShape);
			wallBody.position.set(
				wall.position[0],
				wall.position[1],
				wall.position[2]
			);
			wallBody.quaternion.setFromEuler(
				wall.rotation[0],
				wall.rotation[1],
				wall.rotation[2]
			);
			this.world.addBody(wallBody);
		});

		const transparentMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.3,
			wireframe: false,
			// depthTest: false,
			depthWrite: false,
			// side: THREE.DoubleSide,
		});

		const containerGeometry = new THREE.BoxGeometry(
			this.width,
			this.height,
			this.depth
		);
		const container = new THREE.Mesh(containerGeometry, transparentMaterial);
		this.scene.add(container);

		const containerEdges = new THREE.EdgesGeometry(containerGeometry);
		const containerBorderMaterial = new THREE.LineBasicMaterial({
			color: 0xffffff,
			opacity: 0.4,
		});
		const containerBorderLines = new THREE.LineSegments(
			containerEdges,
			containerBorderMaterial
		);
		this.scene.add(containerBorderLines);

		//create design panels..
		const designPanelMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			opacity: 0.3,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide, // Ensures both sides are rendered only once
		});
		const designPanelGeometry = new THREE.PlaneGeometry(this.width, 3);
		const designPanel1 = new THREE.Mesh(
			designPanelGeometry,
			designPanelMaterial
		);
		designPanel1.position.set(0, 0, -this.depth / 2);

		// const designPanel2 = new THREE.Mesh(
		// 	designPanelGeometry,
		// 	designPanelMaterial
		// );
		// designPanel2.position.set(this.width / 2 - 0.5, 0, -this.depth / 2);

		// const designPanel3 = new THREE.Mesh(
		// 	designPanelGeometry,
		// 	designPanelMaterial
		// );
		// designPanel3.rotation.y = Math.PI / 2;
		// designPanel3.position.set(-this.width / 2, 0, -this.depth / 2 + 0.5);

		// const designPanel4 = new THREE.Mesh(
		// 	designPanelGeometry,
		// 	designPanelMaterial
		// );
		// designPanel4.rotation.y = Math.PI / 2;
		// designPanel4.position.set(this.width / 2, 0, this.depth / 2 - 0.5);

		this.scene.add(designPanel1);
	}

	private createDisplayBox() {
		const boxSize = 1.2;
		const displayGeometry = new THREE.BoxGeometry(boxSize, 2.4, boxSize);
		const displayMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.3,
			depthWrite: false,
			side: THREE.DoubleSide, // Ensures both sides are rendered only once
		});

		const materials: (THREE.MeshBasicMaterial | null)[] = [
			displayMaterial,
			displayMaterial,
			null,
			null,
			displayMaterial,
			displayMaterial,
		];

		const displayBox = new THREE.Mesh(
			displayGeometry,
			materials as THREE.Material[]
		);
		displayBox.position.set(0, this.height / 2, 0);
		this.scene.add(displayBox);

		// Create borders using LineSegments
		const edges = new THREE.EdgesGeometry(displayGeometry);
		const borderMaterial = new THREE.LineBasicMaterial({
			color: 0xffffff,
		}); // White borders
		const displayBorderLines = new THREE.LineSegments(edges, borderMaterial);
		displayBorderLines.position.copy(displayBox.position);

		const centerEdges = new THREE.EdgesGeometry(
			new THREE.PlaneGeometry(boxSize, boxSize)
		);
		const centerBorderLines = new THREE.LineSegments(
			centerEdges,
			borderMaterial
		);
		centerBorderLines.rotation.x = Math.PI / 2;
		centerBorderLines.position.set(0, this.height / 2, 0);

		this.scene.add(displayBorderLines, centerBorderLines);
	}

	private createBalls() {
		const textureLoader = new THREE.TextureLoader();
		textureLoader.load("number.png", (texture) => {
			texture.generateMipmaps = false;
			texture.minFilter = THREE.LinearFilter;
			texture.wrapS = THREE.ClampToEdgeWrapping;
			texture.wrapT = THREE.ClampToEdgeWrapping;

			const rows = 8;
			const cols = 8;

			for (let i = 0; i < this.totalBalls; i++) {
				const ballGroup = new THREE.Group();
				const halfSphereGeometry = new THREE.SphereGeometry(
					0.5,
					32,
					16,
					0,
					Math.PI
				);
				const halfSphereMaterial = new THREE.MeshBasicMaterial({
					map: texture.clone(),
					transparent: true,
				});

				if (halfSphereMaterial.map) {
					const col = i % cols;
					const row = Math.floor(i / cols);
					halfSphereMaterial.map.repeat.set(1 / cols, 1 / rows);
					halfSphereMaterial.map.offset.set(
						col / cols,
						1 - (row + 1) / rows
					);
				}

				const halfSphere = new THREE.Mesh(
					halfSphereGeometry,
					halfSphereMaterial
				);
				const otherHalfSphere = new THREE.Mesh(
					halfSphereGeometry,
					halfSphereMaterial
				);
				otherHalfSphere.rotation.y = Math.PI;

				ballGroup.add(halfSphere, otherHalfSphere);
				this.scene.add(ballGroup);

				const shape = new CANNON.Sphere(0.5);
				const body = new CANNON.Body({
					mass: 1,
					shape,
					position: new CANNON.Vec3(
						(Math.random() - 0.5) * this.width,
						(Math.random() * this.height) / 2 - 1,
						(Math.random() - 0.5) * this.depth
					),
				});

				this.world.addBody(body);
				this.balls.push(ballGroup);
				this.ballBodies.push(body);
			}
		});
	}

	private createButtons() {
		const btnW = 4;
		const btnH = 0.2;
		const btnD = 1;

		const button1 = new Button(
			this.scene,
			1,
			"START DRAW",
			btnW,
			btnH,
			btnD,
			false,
			0x0066ff,
			0x3385ff,
			0xffffff
		);
		button1.setPosition(
			new THREE.Vector3(
				this.width / 2 + 3.5,
				-this.height / 2 + 0.15,
				this.depth / 2 - btnD / 2
			)
		);

		const button2 = new Button(
			this.scene,
			2,
			"RESET",
			btnW,
			btnH,
			btnD,
			false,
			0xff3333,
			0xff6666,
			0xffffff
		);
		button2.setPosition(
			new THREE.Vector3(
				this.width / 2 + 3.5,
				-this.height / 2 + 0.15,
				this.depth / 2 - btnD / 2 - btnD - 0.5
			)
		);

		this.buttons.push(button1);
		this.buttons.push(button2);
	}

	private createFireworks(fireworkCount: number = 10) {
		let count = 0;

		//initial fireworks..
		this.createFirework();

		const timer = setInterval(() => {
			count++;
			this.createFirework();
			if (count === fireworkCount - 1) {
				clearInterval(timer);
			}
		}, 2000);
	}

	private createFirework() {
		const particleCount = 50; // Number of smoke particles

		const startLocation = new THREE.Vector3(0, 0, this.depth / 2);
		const endLocation = new THREE.Vector3(
			Math.random() * 10 - 5,
			Math.random() * 3 + 3,
			Math.random() * 3
		); // End location for firework

		const direction = new THREE.Vector3().subVectors(
			endLocation,
			startLocation
		);
		const totalDistance = direction.length(); // Distance from start to end

		const unitDirection = direction.clone().normalize();

		const stepSize = totalDistance / particleCount;

		const particles: THREE.Mesh[] = [];
		for (let count = 0; count < particleCount; count++) {
			// Small spheres for visible smoke particles
			const geometry = new THREE.SphereGeometry(0.12, 8, 8);

			const material = new THREE.MeshBasicMaterial({
				color: 0xffccc3, // Light gray color for smoke
				transparent: true,
				opacity: 0.7,
			});
			const particle = new THREE.Mesh(geometry, material);

			const step = unitDirection.clone().multiplyScalar(stepSize * count);
			particle.position.set(
				startLocation.x + step.x,
				startLocation.y + step.y,
				startLocation.z + step.z
			);
			this.scene.add(particle);
			particles.push(particle);
		}

		const tl = gsap.timeline({
			onComplete: () => {
				this.createExplosion(endLocation);
				particles.forEach((particle) => {
					(particle.material as THREE.MeshBasicMaterial).dispose();
					particle.geometry.dispose();
					this.scene.remove(particle);
				});
			},
		});
		tl.addLabel("init");
		particles.forEach((particle, i) => {
			tl.fromTo(
				particle.scale,
				{ x: 0, y: 0, z: 0 },
				{
					x: 1,
					y: 1,
					z: 1,
					repeat: 1,
					yoyo: true,
					ease: "power3.out",
					delay: i * 0.02,
				},
				"init"
			);
			tl.to(
				particle.material,
				{
					opacity: 0,
					ease: "power3.out",
					duration: 1,
					delay: i * 0.02,
				},
				"init"
			);
		});
	}

	// In your createExplosion method, define the particles and their velocities
	private createExplosion(endLocation: THREE.Vector3) {
		const particleCount = 40; // Number of explosion particles that move
		const extraParticleCount = 15; // Number of additional particles that stay in place
		const particleRadius = 5; // Radius of the explosion

		// Generate moving particles
		for (let i = 0; i < particleCount; i++) {
			const geometry = new THREE.SphereGeometry(0.1, 8, 8); // Smaller spheres for explosion
			const material = new THREE.MeshBasicMaterial({
				transparent: true,
				opacity: 1,
			});

			// Random direction within a sphere (3D explosion)
			const direction = new THREE.Vector3(
				Math.random() * 2 - 1,
				Math.random() * 2 - 1,
				Math.random() * 2 - 1
			).normalize(); // Normalize to get a random direction

			const distance = Math.random() * 1 + 4;

			// Random bright color for each particle
			const hue = Math.random(); // Random hue (0 to 1)
			const saturation = 1; // Max saturation (bright)
			const lightness = 0.5 + Math.random() * 0.3; // Lightness between 0.5 and 0.8 for brightness
			material.color.setHSL(hue, saturation, lightness);

			// Set initial position at the endLocation
			const particle = new THREE.Mesh(geometry, material);
			particle.position.set(endLocation.x, endLocation.y, endLocation.z);

			// Add particle to scene
			this.scene.add(particle);

			// Animate the particle
			gsap.to(particle.position, {
				x: particle.position.x + direction.x * distance,
				y: particle.position.y + direction.y * distance,
				z: particle.position.z + direction.z * distance,
				duration: 1.2, // Adjust duration for faster movement
				ease: "power4.out", // Burst of speed at first, then slows down
			});
			gsap.to(particle.material, {
				opacity: 0,
				duration: 0.5, // Fade out effect
				delay: 0.7,
				onComplete: () => {
					// Dispose geometry and material to free memory
					particle.material.dispose();
					particle.geometry.dispose();
					this.scene.remove(particle); // Remove from scene
				},
			});
		}

		// Generate extra stationary particles that don't move but fade out
		for (let i = 0; i < extraParticleCount; i++) {
			const geometry = new THREE.SphereGeometry(0.1, 8, 8); // Smaller spheres for explosion
			const material = new THREE.MeshBasicMaterial({
				transparent: true,
				opacity: 1,
			});

			// Random position within the radius around the end location
			const randomOffset = new THREE.Vector3(
				Math.random() * 2 - 1,
				Math.random() * 2 - 1,
				Math.random() * 2 - 1
			)
				.normalize()
				.multiplyScalar(Math.random() * particleRadius);

			const hue = Math.random(); // Random hue (0 to 1)
			const saturation = 1; // Max saturation (bright)
			const lightness = 0.5 + Math.random() * 0.3; // Lightness between 0.5 and 0.8 for brightness
			material.color.setHSL(hue, saturation, lightness);

			// Set initial position at a random location within the radius
			const particle = new THREE.Mesh(geometry, material);
			particle.position.set(
				endLocation.x + randomOffset.x,
				endLocation.y + randomOffset.y,
				endLocation.z + randomOffset.z
			);

			// Add particle to scene
			this.scene.add(particle);

			// Delay the appearance of each extra particle
			gsap.fromTo(
				particle.scale,
				{
					x: 0,
					y: 0,
					z: 0,
				},
				{
					x: 1,
					y: 1,
					z: 1,
					ease: "power3.out",
					delay: 0.2 + i * 0.1, // Random delay for each extra particle
				}
			);
			gsap.to(particle.material, {
				opacity: 0,
				duration: 1, // Fade out effect
				delay: 0.2 + i * 0.1, // Random delay for each extra particle

				onComplete: () => {
					// Dispose geometry and material to free memory
					particle.material.dispose();
					particle.geometry.dispose();
					this.scene.remove(particle); // Remove from scene
				},
			});
		}
	}

	private createSelectGamePanel() {
		// Create game panel here...
		new FontLoader().load(this.fontURL, (font) => {
			console.log("loaded..");

			const titleGroup = new THREE.Group();
			//create main panel..
			const panelGeometry = new THREE.BoxGeometry(5, 1, 0.1);
			const panelMaterial = new THREE.MeshBasicMaterial({
				color: 0x3399ff,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.7,
				//depthTest: false, // Disable depth testing for selection panel to appear on top of other objects
			}); // Black color for selection panel
			const panel = new THREE.Mesh(panelGeometry, panelMaterial);
			titleGroup.add(panel);
			const panelLabelGeometry = new TextGeometry("Select Lotto", {
				font,
				size: 0.3,
				depth: 0,
			});
			const panelLabelMaterial = new THREE.MeshBasicMaterial({
				color: 0xfefefe,
			});
			const panelLabel = new THREE.Mesh(
				panelLabelGeometry,
				panelLabelMaterial
			);
			panelLabel.position.z = 0.1;
			panelLabel.position.y = -0.15;
			panelLabel.position.x = -2;

			titleGroup.add(panelLabel);

			titleGroup.position.set(this.width / 2 + 4, this.height / 2 + 0.3, 0);

			this.scene.add(titleGroup);
			this.selectPanelGroup.push(titleGroup);

			for (let i = 0; i < 5; i++) {
				const selectGroup = new THREE.Group();

				//create mesh..
				const selectGeometry = new THREE.BoxGeometry(5, 1, 0.1);
				const selectMaterial = new THREE.MeshBasicMaterial({
					color: 0xffffff,
					side: THREE.DoubleSide,
					transparent: true,
					opacity: 0.7,
					//depthTest: false, // Disable depth testing for selection panel to appear on top of other objects
				}); // Red color for selection panel
				const selectPlane = new THREE.Mesh(selectGeometry, selectMaterial);
				selectGroup.add(selectPlane);

				//create label..
				const text = `[6/${this.gamesData[i].value}]  ${this.gamesData[i].label}`;
				const labelGeometry = new TextGeometry(text, {
					font,
					size: 0.3,
					depth: 0,
				});
				const labelMaterial = new THREE.MeshBasicMaterial({
					color: 0x1a1a1a,
				});
				const label = new THREE.Mesh(labelGeometry, labelMaterial);
				label.position.set(-2, -0.1, 0.1);

				selectGroup.add(label);

				selectGroup.position.set(
					this.width / 2 + 4,
					this.height / 2 - 1 - i * 1.2,
					0
				);

				this.scene.add(selectGroup);
				this.selects.push(selectGroup);
				this.selectPanelGroup.push(selectGroup);
			}
			//animate..
			this.selects.forEach((select, i) => {
				gsap.fromTo(
					select.scale,
					{ x: 0, y: 0 },
					{
						x: 1,
						y: 1,
						ease: "elastic.out(1,0.5)",
						duration: 0.8,
						delay: i * 0.1,
					}
				);
			});
		});
	}

	private createTimerIndicators() {
		const radius = 8;

		const degreePerPlane = 360 / this.totalPlanes; // Angle per plane in degrees
		// const startAngle = -90 + degreePerPlane;
		const startAngle = 0;

		for (let i = 0; i < this.totalPlanes; i++) {
			const plane = new THREE.PlaneGeometry(0.8, 0.4);
			const material = new THREE.MeshBasicMaterial({
				color: 0x333333,
				side: THREE.DoubleSide,
			});

			const planeMesh = new THREE.Mesh(plane, material);

			const angleInDegrees = startAngle + i * degreePerPlane;
			const angle = (angleInDegrees * Math.PI) / 180;
			// const angle = (i * Math.PI * 2) / this.totalPlanes + startAngleOffset;
			planeMesh.rotation.x = -Math.PI / 2;
			planeMesh.rotation.z = -angle; // Rotate around Y instead of Z

			planeMesh.position.y = -this.height / 2;
			planeMesh.position.x = Math.cos(angle) * radius;
			planeMesh.position.z = Math.sin(angle) * radius;
			this.scene.add(planeMesh);
			this.timerPlanes.push(planeMesh);
		}
	}

	private buttonClicked(index: number) {
		const button = this.buttons[index] as Button;
		if (!button.isEnabled()) return;
		button.onClick();

		switch (index) {
			//..start draw button..
			case 0:
				if (this.drawnBalls.length >= 6) {
					this.resetAllBalls();
					this.resetTimerPlanes();

					setTimeout(() => {
						this.startDraw();
					}, 1500);
				} else {
					if (!this.isDrawing) {
						this.startDraw();
					}
				}

				this.buttons.forEach((button) => {
					button.enable(false);
				});
				break;
			//reset button
			case 1:
				this.resetAllBalls();
				this.startLightingEffect();
				this.buttons.forEach((button) => {
					button.enable(false);
				});
				this.buttons[0].setLabel("START DRAW");
				setTimeout(() => this.showSelectPanel(), 1000);
				setTimeout(() => this.showSchedule(), 1500);

				break;
			default:
			//todo..
		}
	}

	private selectButtonClicked(index: number) {
		if (!this.selects[index]) return;
		console.log("selectButtonClicked");
		gsap.to(this.selects[index].scale, {
			x: 0.95,
			y: 0.95,
			repeat: 1,
			yoyo: true,
			ease: "power4.out",
			duration: 0.05,
			onComplete: () => {
				this.totalBalls = this.gamesData[index].value;
				this.buttons.forEach((button) => {
					button.enable(true);
				});
				this.resetAllBalls();
				this.showSelectPanel(false);
				this.showSchedule(false);
			},
		});
	}

	private selectButtonHover(index: number) {
		if (!this.selects[index]) return;

		const hoveredMesh = this.selects[index].children[0] as THREE.Mesh;
		if (hoveredMesh && hoveredMesh.material) {
			(hoveredMesh.material as THREE.MeshBasicMaterial).color.set(0xb3ffff);
		}
	}

	private showSelectPanel(show: boolean = true) {
		if (show) {
			//..
			this.selectPanelGroup[0].visible = true;
			this.selects.forEach((select, i) => {
				select.visible = true;
				gsap.fromTo(
					select.scale,
					{ x: 0, y: 0 },
					{
						x: 1,
						y: 1,
						ease: "elastic.out(1, 0.6)",
						duration: 0.5,
						delay: i * 0.05,
					}
				);
			});
		} else {
			let count: number = 0;
			this.selects.forEach((select, i) => {
				gsap.to(select.scale, {
					x: 0,
					y: 0,
					ease: "elastic.in(1, 0.6)",
					duration: 0.4,
					delay: (this.selects.length - 1 - i) * 0.05,
					onComplete: () => {
						count++;
						select.visible = false;
						if (count === this.selects.length) {
							this.selectPanelGroup[0].visible = false;
						}
					},
				});
			});
		}
	}

	private showSchedule(show: boolean = true) {
		//..
		if (show) {
			//todo..
			this.schedulePanelGroup[0].visible = true;
			const dates = this.schedulePanelGroup.slice(
				1,
				this.schedulePanelGroup.length
			);
			dates.forEach((date, i) => {
				gsap.to(date.rotation, {
					y: 0,
					ease: "power2.out",
					duration: 0.1,
					delay: i * 0.05,
				});
				date.visible = true;
			});
		} else {
			const dates = this.schedulePanelGroup.slice(
				1,
				this.schedulePanelGroup.length
			);
			let count = 0;
			dates.forEach((date, i) => {
				gsap.to(date.rotation, {
					y: Math.PI / 2,
					ease: "power1.out",
					duration: 0.2,
					delay: i * 0.1,
					onComplete: () => {
						count++;
						date.visible = false;
						if (count === dates.length) {
							this.schedulePanelGroup[0].visible = false;
						}
					},
				});
			});
		}
	}

	private createJumpPath(
		start: THREE.Vector3,
		end: THREE.Vector3,
		height: number,
		numPoints: number = 30
	): THREE.Vector3[] {
		const points: THREE.Vector3[] = [];

		// Midpoint between start and end

		for (let i = 0; i <= numPoints; i++) {
			const t = i / numPoints; // Normalized progress (0 to 1)

			// Interpolate X and Z linearly (horizontal movement)
			const x = THREE.MathUtils.lerp(start.x, end.x, t);
			const z = THREE.MathUtils.lerp(start.z, end.z, t);

			// Quadratic formula for height (parabolic arc)
			const y = start.y + height * Math.sin(t * Math.PI); // Half-oval jump

			points.push(new THREE.Vector3(x, y, z));
		}

		return points;
	}

	private drawBall = () => {
		if (!this.isDrawing || this.drawnBalls.length >= 6) return;

		let nearestIndex: number | null = null;
		let minDistance = Infinity;

		this.balls.forEach((_, index) => {
			const body = this.ballBodies[index];
			const distance = Math.sqrt(
				body.position.x ** 2 + body.position.y ** 2 + body.position.z ** 2
			);

			if (distance < minDistance) {
				minDistance = distance;
				nearestIndex = index;
			}
		});

		if (nearestIndex === null) return;

		const nearestBall = this.balls[nearestIndex];
		const nearestBody = this.ballBodies[nearestIndex];

		this.world.removeBody(nearestBody);
		this.balls.splice(nearestIndex, 1);
		this.ballBodies.splice(nearestIndex, 1);

		const drawnXPosition: number =
			this.drawnBalls.length * 1.4 - this.width / 2;

		const pointA = new THREE.Vector3(0, this.height / 2 + 2.6, 0);
		const pointB = new THREE.Vector3(
			drawnXPosition,
			this.height / 2 + 2.6,
			this.depth / 2 + 2.8
		);
		const pathPoints = this.createJumpPath(pointA, pointB, 2);

		gsap.to(nearestBall.position, {
			x: 0,
			y: this.height / 2 + 0.6,
			z: 0,
			duration: 0.3,
			ease: "power4.out",
			onComplete: () => {
				const tl = gsap.timeline({
					delay: 0.5,
					onComplete: () => {
						gsap.to(nearestBall.rotation, {
							x: -0.7,
							y: 0,
							z: 0,
							ease: "power4.out",
							duration: 0.2,
						});
					},
				});

				tl.addLabel("main")

					// Initial lift (smooth ease-out)
					.to(
						nearestBall.position,
						{
							x: 0,
							y: "+=2",
							z: 0,
							ease: "power4.inOut", // Smooth acceleration
							duration: 0.2, // Slightly longer for natural lift
						},
						"main"
					)

					// Rotation during lift
					.to(
						nearestBall.rotation,
						{
							// x: "+=" + (Math.random() * 50 - 25),
							// y: "+=" + (Math.random() * 50 - 25),
							// z: "+=" + (Math.random() * 50 - 25),
							x: "+=30",
							y: "+=" + (Math.random() * 30 - 15),
							z: "+=" + (Math.random() * 30 - 15),

							ease: "linear",
							duration: 1.3, // Syncs better with the arc
						},
						"main"
					)

					// Smooth jump along motion path
					.to(
						nearestBall.position,
						{
							duration: 0.8, // Longer for a better motion arc
							ease: "linear", // More natural easing for arc motion
							motionPath: {
								path: pathPoints,
								autoRotate: true, // Aligns object along the path
							},
						},
						"main+=0.15" // Keep slight delay before jump path
					)

					// Final drop with bounce
					.to(
						nearestBall.position,
						{
							y: -this.height / 2 + 0.6, // Final landing position
							duration: 0.4, // Keeps it balanced
							ease: "bounce.out", // Natural bounce effect
						},
						"main+=0.9" // Starts right after the jump path finishes
					);

				// const timeline = gsap.timeline();

				// timeline
				// 	.to(nearestBall.rotation, {
				// 		x: -0.7,
				// 		y: 0,
				// 		z: 0,
				// 		ease: "power1.inOut",
				// 		duration: 0.8,
				// 	})
				// 	.to(nearestBall.position, {
				// 		x: 0,
				// 		y: this.height / 2 + 5.6,
				// 		z: 0,
				// 		duration: 0.1, // Adjust speed
				// 		ease: "power2.out",
				// 	})
				// 	.to(nearestBall.rotation, {
				// 		duration: 1,
				// 		ease: "linear",
				// 		motionPath: {
				// 			path: pathPoints,
				// 			align: "self",
				// 			autoRotate: true,
				// 		},
				// 	})
				// 	.to(nearestBall.position, {
				// 		y: -this.height / 2 + 0.6, // Final drop position
				// 		duration: 1,
				// 		ease: "bounce.out",
				// 	});
			},
		});

		this.drawnBalls.push(nearestBall);
	};

	private startDraw = () => {
		this.isDrawing = true;
		let drawCount = 0;

		this.startLightingEffect(this.drawInterval * 1000);

		const timeInterval = setInterval(() => {
			this.drawBall();

			if (drawCount < this.maxDrawCount - 1) {
				this.startLightingEffect(this.drawInterval * 1000);
			}

			drawCount++;

			if (drawCount >= this.maxDrawCount) {
				clearInterval(timeInterval);
				setTimeout(() => this.endDraw(), this.drawInterval * 1000 - 2000);
			}
		}, this.drawInterval * 1000);
	};

	private endDraw() {
		this.isDrawing = false;
		this.buttons[0].enable();
		this.buttons[1].enable();

		this.buttons[0].setLabel("DRAW AGAIN");
		this.blinkTimerPlanes();
		this.createFireworks();
	}

	private resetAllBalls() {
		// Remove all balls (both active and drawn) from scene
		[...this.balls, ...this.drawnBalls].forEach((ball) => {
			this.scene.remove(ball);
		});

		// Remove all physics bodies from world
		this.ballBodies.forEach((body) => {
			this.world.removeBody(body);
		});

		// Clear all arrays
		this.balls = [];
		this.ballBodies = [];
		this.drawnBalls = [];

		// Recreate balls
		this.createBalls();
	}

	// Function to light up planes gradually and stop after all draws
	private startLightingEffect(totalDuration: number = 1000) {
		this.resetTimerPlanes();

		const intervalBetweenPlanes = totalDuration / this.totalPlanes; // Time per plane

		this.timerPlanes.forEach((plane, index) => {
			setTimeout(() => {
				(plane.material as THREE.MeshBasicMaterial).color.set(0xffcc00); // Bright color
			}, index * intervalBetweenPlanes);
		});
	}

	private resetTimerPlanes() {
		clearInterval(this.blinkTimer);
		this.timerPlanes.forEach((plane) => {
			(plane.material as THREE.MeshBasicMaterial).color.set(0x333333); // Dim color
		});
	}

	private blinkTimerPlanes() {
		let blink = false;
		clearInterval(this.blinkTimer);

		this.blinkTimer = setInterval(() => {
			this.timerPlanes.forEach((plane) => {
				(plane.material as THREE.MeshBasicMaterial).color.set(
					blink ? 0x333333 : 0xffcc00
				);
			});
			blink = !blink;
		}, 500);
	}

	private onMouseClick = (event: MouseEvent) => {
		//console.log("e", event);

		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);

		const intersects = this.raycaster.intersectObjects(
			this.buttons.map((btn) => btn.getMesh()),
			true
		);

		if (intersects.length > 0) {
			const clickedObject = intersects[0].object.parent as THREE.Group; // Ensure it's a group
			const clickedIndex = this.buttons.findIndex(
				(btn) => btn.getMesh() === clickedObject
			);

			if (clickedIndex !== -1) {
				// console.log("Clicked Button Index:", clickedIndex);
				this.buttonClicked(clickedIndex); // Call your button click handler
			}
			return;
		}

		const selectIntersects = this.raycaster.intersectObjects(
			this.selects,
			true
		);
		if (selectIntersects.length > 0) {
			const clickedSelect = selectIntersects[0].object.parent as THREE.Group; // Ensure it's a group
			const clickedSelectIndex = this.selects.findIndex(
				(select) => select === clickedSelect
			);
			if (clickedSelectIndex !== -1) {
				console.log("Clicked Select Index:", clickedSelectIndex);
				this.selectButtonClicked(clickedSelectIndex); // Call your button click handler
			}
			return;
		}
	};

	private onMouseMove = (event: MouseEvent) => {
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);

		// Check for hover on selects
		const selectIntersects = this.raycaster.intersectObjects(
			this.selects,
			true
		);

		const buttonIntersects = this.raycaster.intersectObjects(
			this.buttons.map((btn) => btn.getMesh()),
			true
		);

		if (selectIntersects.length > 0) {
			const clickedSelect = selectIntersects[0].object.parent as THREE.Group; // Ensure it's a group
			const clickedSelectIndex = this.selects.findIndex(
				(select) => select === clickedSelect
			);
			if (clickedSelectIndex !== -1) {
				// console.log("Clicked Select Index:", clickedSelectIndex);
				this.selectButtonHover(clickedSelectIndex);
			}
			return;
		} else if (buttonIntersects.length > 0) {
			//..
			const hoveredButton = buttonIntersects[0].object.parent as THREE.Group; // Ensure it's a group
			const hoveredButtonIndex = this.buttons.findIndex(
				(btn) => btn.getMesh() === hoveredButton
			);
			this.buttons[hoveredButtonIndex].onHover();
			return;
		} else {
			this.resetSelects();
			this.resetButtons();
		}
	};

	private resetButtons() {
		this.buttons.forEach((button) => {
			button.reset();
		});
	}
	private resetSelects() {
		this.selects.forEach((select) => {
			const selectMesh = select.children[0] as THREE.Mesh;
			if (selectMesh && selectMesh.material) {
				(selectMesh.material as THREE.MeshBasicMaterial).color.set(
					0xffffff
				);
			}
		});
	}

	private setupEventListeners() {
		window.addEventListener("resize", () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		});
		window.addEventListener("click", this.onMouseClick);
		window.addEventListener("mousemove", this.onMouseMove);
	}

	public destroy() {
		window.removeEventListener("click", this.onMouseClick);
		window.removeEventListener("mousemove", this.onMouseMove);
	}

	private animate = () => {
		requestAnimationFrame(this.animate);

		if (this.isDrawing) {
			// Apply upward air force
			this.ballBodies.forEach((body) => {
				const airForce = new CANNON.Vec3(0, 10, 0);
				body.applyForce(airForce, body.position);
			});
		}

		this.world.step(1 / 60);

		// Sync Three.js balls with Cannon.js physics and add rotation
		for (let i = 0; i < this.balls.length; i++) {
			this.balls[i].position.copy(this.ballBodies[i].position);

			this.balls[i].rotation.x += this.ballBodies[i].velocity.y * 0.05;
			this.balls[i].rotation.y += this.ballBodies[i].velocity.x * 0.05;
			this.balls[i].rotation.z += this.ballBodies[i].velocity.z * 0.05;
		}

		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	};
}
