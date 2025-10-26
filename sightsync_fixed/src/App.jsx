import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Volume2, VolumeX, Loader2, AlertCircle, X, Aperture } from 'lucide-react';

// Reusable button with hover and focus TTS
function AccessibleButton({ label, hoverText, onClick, onMouseLeave, children, className, activateSpeech }) {
  const speakText = (text) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;  // slower
      utterance.pitch = 0.6; // deeper
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleClick = (e) => {
    if (activateSpeech) activateSpeech();
    if (onClick) onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => speakText(hoverText)}
      onMouseLeave={() => {
        stopSpeaking();
        if (onMouseLeave) onMouseLeave();
      }}
      onFocus={() => speakText(hoverText)}
      onBlur={stopSpeaking}
      aria-label={label}
      className={className}
    >
      {children}
    </button>
  );
}

export default function SightSyncApp() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Take or select a photo to begin');
  const [error, setError] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [stream, setStream] = useState(null);
  const [speechActivated, setSpeechActivated] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const currentUtterance = useRef(null);

  const BACKEND_URL = 'https://ai-hackathon-2025-4.onrender.com/process';

  // Activate speech synthesis on first user interaction
  const activateSpeech = () => {
    if (!speechActivated && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance('Audio guidance enabled. Hover over buttons to hear descriptions.');
      utterance.rate = 0.85;   // slower
      utterance.pitch = 0.7;   // deeper
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
      setSpeechActivated(true);
    }
  };

  // Desktop detection
  useEffect(() => {
    const checkIfDesktop = () => {
      const hasPointer = window.matchMedia('(pointer: fine)').matches;
      const isWideScreen = window.innerWidth >= 768;
      setIsDesktop(hasPointer && isWideScreen);
    };
    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);
    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);

  // Initialize speech synthesis on mount (desktop only)
  useEffect(() => {
    if (isDesktop) {
      speakText('Welcome to SightSync. AI-Powered Image Descriptions for the visually impaired. Take or select a photo to begin.');
    }
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopWebcam();
    };
  }, [isDesktop]);

  // Announce status message changes (desktop only)
  useEffect(() => {
    if (statusMessage && ttsEnabled && isDesktop) {
      speakText(statusMessage);
    }
  }, [statusMessage, isDesktop, ttsEnabled]);

  // Announce errors (desktop only)
  useEffect(() => {
    if (error && ttsEnabled && isDesktop) {
      speakText(`Error: ${error}`);
    }
  }, [error, isDesktop, ttsEnabled]);

  const speakText = (text, isHoverText = false) => {
    if (!ttsEnabled && !isHoverText) return;
    if (!window.speechSynthesis || !isDesktop) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (isHoverText) {
      utterance.rate = 0.9;
      utterance.pitch = 0.6;
      utterance.volume = 0.8;
    } else {
      utterance.rate = 0.85;
      utterance.pitch = 0.7;
      utterance.volume = 1.0;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    currentUtterance.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setStatusMessage('Image selected. Processing automatically...');
      setError('');
      setTimeout(() => uploadImage(file), 500);
    }
  };

  const handleUploadClick = () => {
    if (isDesktop) {
      speakText('Opening file picker to upload image');
    }
    fileInputRef.current?.click();
  };

  const startWebcam = async () => {
    try {
      if (isDesktop) {
        speakText('Opening camera');
      }
      
      setStatusMessage('Starting camera...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setShowWebcam(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setStatusMessage('Camera ready. Click capture button to take photo.');
          };
        }
      }, 100);
      
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Unable to access camera. Please check permissions and ensure you\'re using HTTPS or localhost.');
      setStatusMessage('Camera access denied');
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowWebcam(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready. Please try again.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError('Camera not ready. Please wait a moment and try again.');
      return;
    }

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(blob));
        setStatusMessage('Photo captured! Processing automatically...');
        
        if (isDesktop) {
          speakText('Photo captured successfully. Processing image.');
        }
        
        stopWebcam();
        setTimeout(() => uploadImage(file), 500);
      }
    }, 'image/jpeg', 0.95);
  };

  const toggleTTS = () => {
    const newState = !ttsEnabled;
    setTtsEnabled(newState);
    if (newState && isDesktop) {
      speakText('Text to speech enabled');
    } else {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const uploadImage = async (imageFile = null) => {
    const fileToUpload = imageFile || selectedImage;
    
    if (!fileToUpload) return;

    if (isDesktop) {
      speakText('Processing image. Please wait.');
    }
    setIsProcessing(true);
    setStatusMessage('Processing image...');
    setError('');

    const formData = new FormData();
    formData.append('image', fileToUpload);

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

      if (isDesktop) {
        window.speechSynthesis.cancel();
      }

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setStatusMessage('Playing audio description...');

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
        {/* Speech Activation Overlay */}
        {!speechActivated && isDesktop && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
              <Volume2 className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Enable Audio Guidance</h2>
              <p className="text-gray-600 mb-6">
                Click the button below to enable hover audio descriptions for better accessibility.
              </p>
              <button
                onClick={activateSpeech}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl p-4 font-semibold transition-all transform hover:scale-105 active:scale-95"
              >
                Enable Audio Guidance
              </button>
            </div>
          </div>
        )}

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
          {/* TTS Toggle - Only show on desktop */}
          {isDesktop && (
            <div className="mb-4 flex justify-end">
              <AccessibleButton
                label={ttsEnabled ? 'Turn off text to speech' : 'Turn on text to speech'}
                hoverText={ttsEnabled ? 'Text to speech toggle - Currently enabled, click to disable' : 'Text to speech toggle - Currently disabled, click to enable'}
                onClick={toggleTTS}
                activateSpeech={activateSpeech}
                className={`p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
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
              </AccessibleButton>
            </div>
          )}

          {/* Webcam View or Image Preview */}
          <div className="mb-6">
            {showWebcam ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover rounded-2xl shadow-lg bg-black"
                />
                <AccessibleButton
                  label="Close camera"
                  hoverText="Close camera button - Click to exit camera view"
                  onClick={stopWebcam}
                  activateSpeech={activateSpeech}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </AccessibleButton>
                <AccessibleButton
                  label="Capture photo"
                  hoverText="Capture photo button - Click to take a picture"
                  onClick={capturePhoto}
                  activateSpeech={activateSpeech}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white hover:bg-gray-100 text-gray-900 p-4 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                >
                  <Aperture className="w-8 h-8" />
                </AccessibleButton>
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
            {isProcessing && (
              <div className="mt-2 flex justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
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
          {!showWebcam && !isProcessing && (
            <div className="grid grid-cols-2 gap-3">
              <AccessibleButton
                label="Open webcam to take a photo"
                hoverText="Camera button - Opens webcam to take a photo"
                onClick={startWebcam}
                activateSpeech={activateSpeech}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-3 flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-blue-300"
              >
                <Camera className="w-6 h-6" aria-hidden="true" />
                <span className="text-xs font-medium">Camera</span>
              </AccessibleButton>

              <AccessibleButton
                label="Upload an image file"
                hoverText="Upload button - Select an image file from your computer"
                onClick={handleUploadClick}
                activateSpeech={activateSpeech}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl p-3 flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-red-300"
              >
                <Upload className="w-6 h-6" aria-hidden="true" />
                <span className="text-xs font-medium">Upload</span>
              </AccessibleButton>
            </div>
          )}
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
          aria-label="Hidden file input for upload"
        />

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden audio element */}
        <audio 
          ref={audioRef} 
          className="hidden"
          aria-label="Audio player for image description"
        />
      </div>
    </div>
  );
}
