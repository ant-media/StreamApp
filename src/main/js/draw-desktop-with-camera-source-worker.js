let canvas, ctx;
let canvasWidth = 1920;
let canvasHeight = 1080;
let overlayWidth, overlayHeight;

// Handle messages from the main thread
self.onmessage = function (event) {
    const { type, data } = event.data;

    switch (type) {
        case 'init':
            initializeCanvas(data.canvas, data.width, data.height);
            break;
        case 'frame':
            drawFrame(data.screenFrame, data.cameraFrame);
            break;
        case 'resize':
            resizeCanvas(data.width, data.height);
            break;
        default:
            console.warn('Unknown message type:', type);
    }
};

function initializeCanvas(offscreenCanvas, width, height) {
    canvas = offscreenCanvas;
    ctx = canvas.getContext('2d');
    canvasWidth = width;
    canvasHeight = height;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    overlayWidth = canvasWidth / 4;
    console.log('Canvas initialized in worker.');
}

function resizeCanvas(width, height) {
    canvasWidth = width;
    canvasHeight = height;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    overlayWidth = canvasWidth / 4;
    console.log('Canvas resized in worker:', canvasWidth, canvasHeight);
}

function drawFrame(screenFrame, cameraFrame) {
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw the screen video frame
    ctx.drawImage(screenFrame, 0, 0, canvasWidth, canvasHeight);

    // Draw the camera overlay
    const overlayHeight = overlayWidth * (cameraFrame.height / cameraFrame.width);
    const positionX = canvasWidth - overlayWidth - 20;
    const positionY = canvasHeight - overlayHeight - 20;

    ctx.drawImage(cameraFrame, positionX, positionY, overlayWidth, overlayHeight);

    // Release ImageBitmap resources
    screenFrame.close();
    cameraFrame.close();
}
