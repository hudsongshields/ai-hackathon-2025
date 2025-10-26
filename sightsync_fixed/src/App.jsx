import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Volume2, Loader2, AlertCircle, VolumeX } from 'lucide-react';

export default function SightSyncApp() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Take or select a photo to begin');
  const [error, setError] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const audioRef = useRef(null);
  const currentUtterance = useRef(null);

  const BACKEND_URL = 'http://127.0.0.1:5000/process';

  // Detect if user is on desktop
  useEffect(() => {
    const checkIfDesktop = () => {
      // Check if device has a mouse/pointer (desktop) and screen is wide enough
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
      // Announce app on load
      speakText('Welcome to SightSync. AI-Powered Image Descriptions for the visually impaired. Take or select a photo to begin.');
    }
    
    // Cleanup on unmount
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isDesktop]);

  // Announce status message changes (desktop only)
  useEffect(() => {
    if (statusMessage && ttsEnabled && isDesktop) {
      speakText(statusMessage);
    }
  }, [statusMessage, isDesktop]);

  // Announce errors (desktop only)
  useEffect(() => {
    if (error && ttsEnabled && isDesktop) {
      speakText(`Error: ${error}`);
    }
  }, [error, isDesktop]);

  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis || !isDesktop) return;

    // Cancel any ongoing speech
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

  const handleButtonFocus = (text) => {
    if (ttsEnabled && isDesktop) {
      speakText(text);
    }
  };

  const handleButtonHover = (text) => {
    if (ttsEnabled && isDesktop) {
      speakText(text);
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
    if (isDesktop) {
      speakText('Opening gallery to select image');
    }
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    if (isDesktop) {
      speakText('Opening camera to take photo');
    }
    cameraInputRef.current?.click();
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

  const uploadImage = async () => {
    if (!selectedImage) return;

    if (isDesktop) {
      speakText('Processing image. Please wait.');
    }
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

      // Stop any ongoing TTS before playing audio
      if (isDesktop) {
        window.speechSynthesis.cancel();
      }

      // Play audio
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
              <button
                onClick={toggleTTS}
                onFocus={() => handleButtonFocus(ttsEnabled ? 'Text to speech is currently on. Press to turn off.' : 'Text to speech is currently off. Press to turn on.')}
                onMouseEnter={() => handleButtonHover(ttsEnabled ? 'Text to speech toggle. Currently on.' : 'Text to speech toggle. Currently off.')}
                aria-label={ttsEnabled ? 'Turn off text to speech' : 'Turn on text to speech'}
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
              </button>
            </div>
          )}

          {/* Image Preview */}
          <div className="mb-6">
            {imagePreview ? (
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
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCameraClick}
                onFocus={() => handleButtonFocus('Camera button. Press to take a photo.')}
                onMouseEnter={() => handleButtonHover('Camera button')}
                aria-label="Open camera to take a photo"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-blue-300"
              >
                <Camera className="w-8 h-8" aria-hidden="true" />
                <span className="text-sm font-medium">Camera</span>
              </button>

              <button
                onClick={handleUploadClick}
                onFocus={() => handleButtonFocus('Gallery button. Press to select an image from your device.')}
                onMouseEnter={() => handleButtonHover('Gallery button')}
                aria-label="Open gallery to select an image"
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-green-300"
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
                disabled={isProcessing}
                aria-label={isProcessing ? 'Processing image, please wait' : 'Process image and speak description'}
                aria-busy={isProcessing}
                className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl p-4 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 font-semibold focus:ring-4 focus:ring-purple-300 ${
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
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-blue-200 text-xs">
            Built for accessibility • AI Days Hackathon 2024
          </p>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Hidden file input for gallery"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Hidden file input for camera"
        />

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