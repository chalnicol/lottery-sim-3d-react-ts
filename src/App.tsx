import { useEffect, useRef } from "react";
import LotterySimulation from "./LotterySimulation.ts"; // Import your Three.js class

const ThreeCanvas: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	let threeScene: LotterySimulation | null = null;

	useEffect(() => {
		if (canvasRef.current) {
			threeScene = new LotterySimulation(canvasRef.current);
		}

		return () => {
			threeScene?.destroy(); // Ensure cleanup
		};
	}, []);

	return <canvas ref={canvasRef} style={{ width: "100%", height: "100vh" }} />;
};

export default ThreeCanvas;
