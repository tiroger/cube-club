import AVFoundation
import CoreImage

/// The iPad's front camera feeding the shared CameraFramePipeline, as CubeCamera does on the Mac.
/// Frames are rotated to stay level as the iPad turns, and stay unmirrored like the Mac's.
final class PadCamera: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let frames = CameraFramePipeline()
    var onError: (([String: Any]) -> Void)?
    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "club.cube.camera")
    private var token = ""
    private var wants = false
    private var rotation: AVCaptureDevice.RotationCoordinator?
    private var rotationObservation: NSKeyValueObservation?
    private var output: AVCaptureVideoDataOutput?

    func start(token: String, completion: @escaping ([String: Any]) -> Void) {
        queue.async { [self] in
            self.wants = true
            self.token = token
            self.frames.start(token: token)
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized: self.configure(completion)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    if granted { self.configure(completion) }
                    else { completion(["error": "Camera access is off. You can still paint colors by hand, or allow Cube Club in Settings → Privacy & Security → Camera."]) }
                }
            default: completion(["error": "Camera access is off. Use manual colors, or allow Cube Club in Settings → Privacy & Security → Camera."])
            }
        }
    }

    private func configure(_ completion: @escaping ([String: Any]) -> Void) {
        queue.async { [self] in
            guard self.wants else { completion(["error": "Camera canceled."]); return }
            if self.session.inputs.isEmpty {
                guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front)
                        ?? AVCaptureDevice.default(for: .video),
                      let input = try? AVCaptureDeviceInput(device: device) else {
                    completion(["error": "No camera found. You can enter your cube’s colors by hand."]); return
                }
                let output = AVCaptureVideoDataOutput()
                output.alwaysDiscardsLateVideoFrames = true
                output.setSampleBufferDelegate(self, queue: self.queue)
                self.session.beginConfiguration()
                self.session.sessionPreset = self.session.canSetSessionPreset(.hd1280x720) ? .hd1280x720 : .high
                guard self.session.canAddInput(input), self.session.canAddOutput(output) else {
                    self.session.commitConfiguration()
                    completion(["error": "This camera is unavailable. Try manual color entry."]); return
                }
                self.session.addInput(input)
                self.session.addOutput(output)
                self.session.commitConfiguration()
                self.output = output
                if let connection = output.connection(with: .video), connection.isVideoMirroringSupported {
                    connection.automaticallyAdjustsVideoMirroring = false
                    connection.isVideoMirrored = false
                }
                // The coordinator follows the device's orientation only when created and observed on
                // the main thread; on the camera queue it reported the starting angle and never changed.
                DispatchQueue.main.async { [weak self] in
                    guard let self else { return }
                    var applied = false
                    let coordinator = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: nil)
                    self.rotation = coordinator
                    self.rotationObservation = coordinator.observe(\.videoRotationAngleForHorizonLevelCapture, options: [.initial, .new]) { [weak self] coordinator, _ in
                        // Camera buffers arrive landscape; 0° and 180° keep them landscape like the interface,
                        // 90° and 270° would make them portrait. An iPad passes through those while being
                        // flipped or standing upright, so keep the last landscape angle instead.
                        let angle = coordinator.videoRotationAngleForHorizonLevelCapture
                        let landscape = Int(angle.rounded()) % 180 == 0
                        let use = landscape || !applied
                        guard use else { return }
                        applied = true
                        self?.queue.async { self?.applyRotation(angle) }
                    }
                }
            }
            if !self.session.isRunning { self.session.startRunning() }
            completion(["ok": true])
        }
    }

    private func applyRotation(_ angle: CGFloat) {
        guard let connection = output?.connection(with: .video), connection.isVideoRotationAngleSupported(angle) else { return }
        connection.videoRotationAngle = angle
    }

    func stop() {
        frames.stop()
        queue.async { self.frames.stop(); self.wants = false; if self.session.isRunning { self.session.stopRunning() } }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard wants, let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        frames.submit(CIImage(cvPixelBuffer: buffer))
    }
}
