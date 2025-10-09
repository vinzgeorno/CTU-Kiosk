import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { FaCamera, FaRedo, FaCheckCircle } from 'react-icons/fa';
import './CameraCapture.css';

function CameraCapture({ userData, setUserData }) {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [extractedName, setExtractedName] = useState('');
  const [manualName, setManualName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [showAgeInput, setShowAgeInput] = useState(false);
  const [age, setAge] = useState('');
  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');

  const processImage = useCallback((imageSrc) => {
    if (userData.hasID) {
      // Process ID card with OCR
      setIsProcessing(true);
      Tesseract.recognize(
        imageSrc,
        'eng',
        {
          logger: m => console.log(m),
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ',
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          preserve_interword_spaces: '1'
        }
      ).then(({ data: { text } }) => {
        console.log('Extracted text:', text); // Debug log
        
        // Try multiple patterns to extract meaningful text
        let extractedName = '';
        
        // Pattern 1: Look for "Name:" followed by text
        const nameMatch = text.match(/Name[:\s]+([A-Za-z\s]+)/i);
        if (nameMatch) {
          extractedName = nameMatch[1].trim();
        }
        
        // Pattern 2: Look for common ID patterns (First Last)
        if (!extractedName) {
          const fullNameMatch = text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
          if (fullNameMatch) {
            extractedName = fullNameMatch[1].trim();
          }
        }
        
        // Pattern 3: Extract any meaningful text (fallback)
        if (!extractedName) {
          // Clean the text and get meaningful words
          const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
          const words = cleanText.split(' ').filter(word => word.length >= 2);
          if (words.length > 0) {
            // Take all meaningful words, not just first 2-3
            extractedName = words.join(' ');
          }
        }
        
        // If still no meaningful text, show the raw OCR output for debugging
        const finalText = extractedName || text.trim() || 'No text detected';
        console.log('Final extracted text:', finalText);
        setExtractedName(finalText);
        setIsProcessing(false);
        setShowNameInput(true);
      }).catch(err => {
        console.error('OCR Error:', err);
        setExtractedName('OCR processing failed');
        setIsProcessing(false);
        setShowNameInput(true);
      });
    } else {
      // For no ID, just capture face and ask for name
      setShowNameInput(true);
    }
  }, [userData.hasID]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    processImage(imageSrc);
  }, [processImage]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target.result;
        setCapturedImage(imageSrc);
        processImage(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  }, [processImage]);

  const validateName = (name) => {
    if (!name || name.trim().length === 0) {
      return 'Name is required';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters long';
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return 'Name can only contain letters and spaces';
    }
    return '';
  };

  const validateAge = (ageValue) => {
    if (!ageValue || ageValue.trim().length === 0) {
      return 'Age is required';
    }
    const ageNum = parseInt(ageValue);
    if (isNaN(ageNum)) {
      return 'Age must be a number';
    }
    if (ageNum < 1 || ageNum > 120) {
      return 'Age must be between 1 and 120';
    }
    return '';
  };

  const retake = () => {
    setCapturedImage(null);
    setExtractedName('');
    setManualName('');
    setShowNameInput(false);
    setShowAgeInput(false);
    setAge('');
    setNameError('');
    setAgeError('');
  };

  const confirmName = () => {
    const finalName = userData.hasID ? extractedName : manualName;
    const nameValidationError = validateName(finalName);
    
    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }
    
    setNameError('');
    setShowAgeInput(true);
  };

  const proceed = () => {
    const ageValidationError = validateAge(age);
    
    if (ageValidationError) {
      setAgeError(ageValidationError);
      return;
    }
    
    const finalName = userData.hasID ? extractedName : manualName;
    const ageNum = parseInt(age);
    
    setUserData({
      ...userData,
      name: finalName,
      age: ageNum,
      capturedImage: capturedImage
    });
    navigate('/building-selection');
  };

  return (
    <div className="camera-capture fade-in">
      <div className="camera-container">
        <h1 className="camera-title">
          {userData.hasID ? 'Scan Your ID Card' : 'Capture Your Face'}
        </h1>
        
        <div className="camera-content">
          {!capturedImage ? (
            <div className="capture-options">
              <div className="mode-toggle">
                <button 
                  onClick={() => setUploadMode(false)} 
                  className={!uploadMode ? 'active' : ''}
                >
                  Live Camera
                </button>
                <button 
                  onClick={() => setUploadMode(true)} 
                  className={uploadMode ? 'active' : ''}
                >
                  Upload Image
                </button>
              </div>
              
              {!uploadMode ? (
                <div className="webcam-container">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="webcam"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: "user"
                    }}
                  />
                  <button onClick={capture} className="capture-button">
                    <FaCamera /> Capture
                  </button>
                </div>
              ) : (
                <div className="upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="file-input"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="upload-button">
                    <FaCamera /> Choose Image File
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="captured-container">
              <img src={capturedImage} alt="Captured" className="captured-image" />
              <button onClick={retake} className="retake-button">
                <FaRedo /> Retake
              </button>
            </div>
          )}
          
          {isProcessing && (
            <div className="processing">
              <div className="spinner"></div>
              <p>Processing ID card...</p>
            </div>
          )}
          
          {showNameInput && !showAgeInput && (
            <div className="name-input-container">
              {userData.hasID ? (
                <div className="extracted-name">
                  <h3>Extracted Name:</h3>
                  <input
                    type="text"
                    value={extractedName}
                    onChange={(e) => {
                      setExtractedName(e.target.value);
                      setNameError('');
                    }}
                    className={`name-input ${nameError ? 'error' : ''}`}
                    placeholder="Name from ID"
                  />
                </div>
              ) : (
                <div className="manual-name">
                  <h3>Please Enter Your Name:</h3>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => {
                      setManualName(e.target.value);
                      setNameError('');
                    }}
                    className={`name-input ${nameError ? 'error' : ''}`}
                    placeholder="Enter your full name"
                  />
                </div>
              )}
              
              {nameError && <div className="error-message">{nameError}</div>}
              
              <button 
                onClick={confirmName} 
                className="proceed-button"
                disabled={userData.hasID ? !extractedName : !manualName}
              >
                <FaCheckCircle /> Confirm Name
              </button>
            </div>
          )}

          {showAgeInput && (
            <div className="age-input-container">
              <h3>Please Enter Your Age:</h3>
              <input
                type="number"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  setAgeError('');
                }}
                className={`age-input ${ageError ? 'error' : ''}`}
                placeholder="Enter your age"
                min="1"
                max="120"
              />
              
              {ageError && <div className="error-message">{ageError}</div>}
              
              <div className="age-info">
                <p>💡 Children under 12 receive a 50% discount on facility fees!</p>
              </div>
              
              <button 
                onClick={proceed} 
                className="proceed-button"
                disabled={!age}
              >
                <FaCheckCircle /> Proceed to Facility Selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CameraCapture;
