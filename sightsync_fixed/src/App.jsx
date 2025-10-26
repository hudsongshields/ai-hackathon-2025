import React, { useState, useRef } from 'react';
import { Camera, Upload, Volume2, Loader2, AlertCircle } from 'lucide-react';

export default function SightSyncApp() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Take or select a photo to begin');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const audioRef = useRef(null);

  // CHANGE THIS TO YOUR BACKEND URL
  const BACKEND_URL = 'http://127.0.0.1:5000/process';

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
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const uploadImage = async () => {
    if (!selectedImage) return;

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

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setStatusMessage('Playing audio description...');

        audioRef.current.onended = () => {
          setStatusMessage('Take or select a photo to begin');
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (err) {
      setError(`Error: ${err.message}. Make sure backend is running on ${BACKEND_URL}`);
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
          <h1 className="text-5xl font-bold text-white mb-2">SightSync</h1>
          <p className="text-blue-200 text-sm">AI-Powered Image Descriptions</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-white/20">
          {/* Image Preview */}
          <div className="mb-6">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Selected"
                className="w-full h-64 object-cover rounded-2xl shadow-lg"
              />
            ) : (
              <div className="w-full h-64 bg-white/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/20">
                <Camera className="w-16 h-16 text-white/30" />
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="mb-6 text-center">
            <p className="text-white text-sm leading-relaxed">{statusMessage}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCameraClick}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">Camera</span>
              </button>

              <button
                onClick={handleUploadClick}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Gallery</span>
              </button>
            </div>

            {selectedImage && (
              <button
                onClick={uploadImage}
                disabled={isProcessing}
                className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl p-4 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 font-semibold ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
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
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Hidden audio element */}
        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
}