import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Volume2, Loader2, AlertCircle, VolumeX, X, SwitchCamera } from 'lucide-react';

export default function SightSyncApp() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Take or select a photo to begin');
  const [error, setError] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
 
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const currentUtterance = useRef(null);
  const touchTimerRef = useRef(null);

  const BACKEND_URL = 'https://ai-hackathon-2025-4.onrender.com/process';

  // Initialize speech synthesis on mount
  useEffect(() => {
    speakText('Welcome to SightSync. AI-Powered Image Descriptions for the visually impaired. Take or select a photo to begin.');
   
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cleanup camera stream when component unmounts or camera closes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Announce status message changes
  useEffect(() => {
    if (statusMessage && ttsEnabled) {
      speakText(statusMessage);
    }
  }, [statusMessage, ttsEnabled]);

  // Announce errors
  useEffect(() => {
    if (error && ttsEnabled) {
      speakText(`Error: ${error}`);
    }
  }, [error, ttsEnabled]);

  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
   
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
   
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
   
    currentUtterance.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Handle desktop focus
  const handleButtonFocus = (text) => {
    if (ttsEnabled) {
      speakText(text);
    }
  };

  // Handle desktop hover
  const handleButtonHover = (text) => {
    if (ttsEnabled) {
      speakText(text);
    }
  };

  // Handle mobile touch start (long press detection)
  const handleTouchStart = (text) => {
    if (!ttsEnabled) return;
   
    // Clear any existing timer
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
   
    // Set a timer for 500ms to detect long press
    touchTimerRef.current = setTimeout(() => {
      speakText(text);
    }, 500);
  };

  // Handle mobile touch end (cancel long press)
  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setStatusMessage('Image selected. Tap "Describe & Speak" to continue.');
      setError('');
    }
  };

  const handleUploadClick = () => {
    speakText('Opening gallery to select image');
    fileInputRef.current?.click();
  };

  const openCamera = async (mode = null) => {
    speakText('Opening camera');
    setError('');
   
    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // If no mode specified, default to back camera (environment)
      const requestedMode = mode || 'environment';

      const constraints = {
        video: {
          facingMode: requestedMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
     
      setStream(mediaStream);
      setIsCameraOpen(true);
      setFacingMode(requestedMode);
      setStatusMessage('Camera ready. Click "Capture Photo" to take a picture.');
     
      // Wait for video element to be ready
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Ensure video plays (important for desktop browsers)
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
            setError('Camera started but video playback failed. Try again.');
          });
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      
      let errorMessage = 'Could not access camera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += 'Please check your browser permissions.';
      }
      
      setError(errorMessage);
      setIsCameraOpen(false);
    }
  };

  const flipCamera = async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    speakText(`Switching to ${newMode === 'user' ? 'front' : 'back'} camera`);
    await openCamera(newMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
   
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
   
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
   
    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(blob));
      setStatusMessage('Photo captured. Tap "Describe & Speak" to continue.');
      closeCamera();
    }, 'image/jpeg', 0.95);
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setStatusMessage('Camera closed.');
  };

  const toggleTTS = () => {
    const newState = !ttsEnabled;
    setTtsEnabled(newState);
    if (newState) {
      speakText('Text to speech enabled');
    } else {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return;

    speakText('Processing image. Please wait.');
    setIsProcessing(true);
    setStatusMessage('Processing image...');
    setError('');

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      window.speechSynthesis.cancel();

      // Play audio description
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
       
        // IMPORTANT: For mobile Safari, we need user interaction to play audio
        const playPromise = audioRef.current.play();
       
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setStatusMessage('Playing audio description...');
            })
            .catch(error => {
              console.error('Autoplay prevented:', error);
              setError('Tap the screen to hear the description.');
             
              // Add click listener to play audio on user interaction
              const playOnClick = () => {
                audioRef.current.play();
                document.removeEventListener('click', playOnClick);
                document.removeEventListener('touchstart', playOnClick);
              };
             
              document.addEventListener('click', playOnClick);
              document.addEventListener('touchstart', playOnClick);
            });
        }

        audioRef.current.onended = () => {
          setStatusMessage('Description complete. Take or select another photo.');
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (err) {
      setError(`${err.message}. Make sure backend is running on ${BACKEND_URL}`);
      setStatusMessage('Take or select a photo to begin');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-bold text-white mb-2"
            aria-label="SightSync - AI-Powered Image Descriptions"
          >
            SightSync
          </h1>
          <p className="text-blue-200 text-sm">AI-Powered Image Descriptions</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-white/20">
          {/* TTS Toggle */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={toggleTTS}
              onFocus={() => handleButtonFocus(ttsEnabled ? 'Text to speech is currently on. Press to turn off.' : 'Text to speech is currently off. Press to turn on.')}
              onMouseEnter={() => handleButtonHover(ttsEnabled ? 'Text to speech toggle. Currently on.' : 'Text to speech toggle. Currently off.')}
              onTouchStart={() => handleTouchStart(ttsEnabled ? 'Text to speech toggle. Currently on. Long press to hear description.' : 'Text to speech toggle. Currently off. Long press to hear description.')}
              onTouchEnd={handleTouchEnd}
              aria-label={ttsEnabled ? 'Turn off text to speech' : 'Turn on text to speech'}
              className={`p-3 rounded-xl transition-all transform active:scale-95 ${
                ttsEnabled
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-500 hover:bg-gray-600'
              } text-white`}
            >
              {ttsEnabled ? (
                <Volume2 className="w-5 h-5" aria-hidden="true" />
              ) : (
                <VolumeX className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Camera View or Image Preview */}
          <div className="mb-6">
            {isCameraOpen ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover rounded-2xl shadow-lg"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={flipCamera}
                    onFocus={() => handleButtonFocus('Flip camera button')}
                    onMouseEnter={() => handleButtonHover('Flip camera')}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-all"
                    aria-label="Flip camera"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>
                  <button
                    onClick={closeCamera}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all"
                    aria-label="Close camera"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : imagePreview ? (
              <div>
                <img
                  src={imagePreview}
                  alt="Selected image preview"
                  className="w-full h-64 object-cover rounded-2xl shadow-lg"
                />
                <p className="text-white text-xs mt-2 text-center" aria-live="polite">
                  Image loaded
                </p>
              </div>
            ) : (
              <div
                className="w-full h-64 bg-white/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/20"
                aria-label="No image selected"
              >
                <Camera className="w-16 h-16 text-white/30" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="mb-6 text-center">
            <p
              className="text-white text-sm leading-relaxed"
              aria-live="polite"
              aria-atomic="true"
            >
              {statusMessage}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-3 flex items-start gap-2"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {isCameraOpen ? (
              <button
                onClick={capturePhoto}
                onFocus={() => handleButtonFocus('Capture photo button')}
                onMouseEnter={() => handleButtonHover('Capture photo')}
                onTouchStart={() => handleTouchStart('Capture photo button. Long press to hear description.')}
                onTouchEnd={handleTouchEnd}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 flex items-center justify-center gap-2 transition-all transform active:scale-95 font-semibold"
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
                <span>Capture Photo</span>
              </button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openCamera()}
                    onFocus={() => handleButtonFocus('Camera button. Press to open camera.')}
                    onMouseEnter={() => handleButtonHover('Camera button')}
                    onTouchStart={() => handleTouchStart('Camera button. Long press to hear description.')}
                    onTouchEnd={handleTouchEnd}
                    aria-label="Open camera to take a photo"
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all transform active:scale-95 focus:ring-4 focus:ring-blue-300"
                  >
                    <Camera className="w-8 h-8" aria-hidden="true" />
                    <span className="text-sm font-medium">Camera</span>
                  </button>

                  <button
                    onClick={handleUploadClick}
                    onFocus={() => handleButtonFocus('Gallery button. Press to select an image from your device.')}
                    onMouseEnter={() => handleButtonHover('Gallery button')}
                    onTouchStart={() => handleTouchStart('Gallery button. Long press to hear description.')}
                    onTouchEnd={handleTouchEnd}
                    aria-label="Open gallery to select an image"
                    className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all transform active:scale-95 focus:ring-4 focus:ring-green-300"
                  >
                    <Upload className="w-8 h-8" aria-hidden="true" />
                    <span className="text-sm font-medium">Gallery</span>
                  </button>
                </div>

                {selectedImage && (
                  <button
                    onClick={uploadImage}
                    onFocus={() => handleButtonFocus('Describe and speak button. Press to process your image and hear the description.')}
                    onMouseEnter={() => handleButtonHover('Describe and speak button')}
                    onTouchStart={() => handleTouchStart('Describe and speak button. Long press to hear description.')}
                    onTouchEnd={handleTouchEnd}
                    disabled={isProcessing}
                    aria-label={isProcessing ? 'Processing image, please wait' : 'Process image and speak description'}
                    aria-busy={isProcessing}
                    className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl p-4 flex items-center justify-center gap-2 transition-all transform active:scale-95 font-semibold focus:ring-4 focus:ring-purple-300 ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5" aria-hidden="true" />
                        <span>Describe & Speak</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-blue-200 text-xs">
            Built for accessibility • AI Days Hackathon 2024
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Hidden file input for gallery"
        />

        {/* Hidden canvas for capturing photo */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          className="hidden"
          preload="auto"
          aria-label="Audio player for image description"
        />
      </div>
    </div>
  );
}
  
