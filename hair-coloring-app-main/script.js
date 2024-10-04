import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
const { ImageSegmenter, SegmentationMask, FilesetResolver } = vision;

let imageSegmenter;
let labels;
let runningMode = "VIDEO";

const createImageSegmenter = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://cdn.glitch.global/eb18e63f-936a-4172-8bdd-9263c7a6a04a/hair_segmenter.tflite?v=1689603953377",
            delegate: "CPU"
        },
        runningMode: runningMode,
        outputCategoryMask: true,
        outputConfidenceMasks: true
    });
    labels = imageSegmenter.getLabels();
};

function init() {
    // Get DOM elements
    let video = document.getElementById("webcam");
    let canvasElement = document.getElementById("canvas1");
    let canvasElement2 = document.getElementById("canvas2");

    const canvasCtx = canvasElement.getContext("2d", { willReadFrequently: true });
    const canvasCtx2 = canvasElement2.getContext("2d", { willReadFrequently: true });
    let enableWebcamButton;
    let webcamRunning = false;

    // Initial colors for segmentation
    let legendColors = [
        [0, 0, 0, 0],
        [222, 56, 255, 255] // Default hair color
    ];

    function callbackForVideo(result) {
        canvasElement.style.display = 'block';
        canvasElement2.style.display = 'block';
        let imageData = canvasCtx.getImageData(0, 0, video.videoWidth, video.videoHeight).data;
        const mask = result.categoryMask.getAsFloat32Array();
        let j = 0;

        for (let i = 0; i < mask.length; ++i) {
            const maskVal = Math.round(mask[i] * 255.0);

            if (maskVal % legendColors.length === 0) {
                j += 4;
            } else {
                const legendColor = legendColors[1]; // Use the updated hair color
                imageData[j] = (legendColor[0] + imageData[j]) / 2; // R
                imageData[j + 1] = (legendColor[1] + imageData[j + 1]) / 2; // G
                imageData[j + 2] = (legendColor[2] + imageData[j + 2]) / 2; // B
                imageData[j + 3] = (legendColor[3] + imageData[j + 3]) / 2; // A
                j += 4;
            }
        }

        const uint8Array = new Uint8ClampedArray(imageData.buffer);
        const dataNew = new ImageData(uint8Array, video.videoWidth, video.videoHeight);

        canvasCtx.imageSmoothingEnabled = true;
        canvasCtx.putImageData(dataNew, 0, 0);

        if (webcamRunning === true) {
            window.requestAnimationFrame(predictWebcam);
        }
    }

    async function predictWebcam() {
        // Grab the image from the webcam stream
        canvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvasCtx2.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        if (imageSegmenter === undefined) {
            return;
        }

        let startTimeMs = performance.now();
        imageSegmenter.segmentForVideo(video, startTimeMs, callbackForVideo);
    }

    async function enableCam(event) {
        if (imageSegmenter === undefined) {
            return;
        }
        if (webcamRunning === true) {
            webcamRunning = false;
            enableWebcamButton.innerText = "ENABLE CAMERA";
        } else {
            webcamRunning = true;
            enableWebcamButton.innerText = "CAPTURE THE SELFIE";
        }

        const constraints = {
            video: true
        };

        video = document.getElementById("webcam");
        video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
        video.addEventListener("loadeddata", predictWebcam);
        video.play();
        video.style.display = 'none';
    }

    if (hasGetUserMedia()) {
        enableWebcamButton = document.getElementById("webcamButton");
        enableWebcamButton.addEventListener("click", enableCam);
    } else {
        console.warn("getUserMedia() is not supported by your browser");
    }

    // Color button functionality
    const colorButtons = document.querySelectorAll('.colorButton');

    colorButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const color = event.target.style.backgroundColor;
            const rgb = color.match(/\d+/g).map(Number);

            // Update the hair color in legendColors
            legendColors[1] = [rgb[0], rgb[1], rgb[2], 255]; // Ensure the alpha value is set to 255

            // Optionally, trigger a refresh of the webcam segmentation
            if (webcamRunning) {
                predictWebcam(); // Update webcam segmentation
            }
        });
    });
}

function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

createImageSegmenter();
init();
