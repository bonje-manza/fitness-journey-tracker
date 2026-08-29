import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ProgressPicture } from "../types";
import { Camera, ImagePlus, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";

// Utility to compress an image and return a base64 string
const compressImageToBase64 = (file: File, maxSizeMB: number = 0.5): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Keep it small to ensure it stays well under 1MB Firestore limit
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Return as a base64 string (data URL)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export function ProgressGallery({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<ProgressPicture[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  useEffect(() => {
    const q = query(
      collection(db, "users", userId, "photos"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProgressPicture));
      setPhotos(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setErrorMsg("Please select a valid image file.");
      return;
    }
    
    setSelectedFile(file);
    setErrorMsg("");
    
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg("");
    setUploading(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDate) {
      setErrorMsg("Please provide both a date and an image.");
      return;
    }

    setUploading(true);
    setErrorMsg("");
    
    try {
      // Compress the image directly to a base64 string
      const base64Image = await compressImageToBase64(selectedFile);
      const timestamp = Date.now();
      
      // Fetch body weight for the selected date
      let currentWeight = 0;
      const logRef = doc(db, "users", userId, "logs", selectedDate);
      const logSnap = await getDoc(logRef);
      if (logSnap.exists()) {
        currentWeight = logSnap.data().bodyWeight || 0;
      }
      
      const newPhoto: ProgressPicture = {
        userId,
        date: selectedDate,
        imageUrl: base64Image,
        bodyWeight: currentWeight,
        timestamp
      };

      const docRef = doc(db, "users", userId, "photos", `${selectedDate}_${timestamp}`);
      await setDoc(docRef, newPhoto);
      
      closeModal();
    } catch (error: any) {
      console.error("Upload error:", error);
      setErrorMsg(error.message || "An unexpected error occurred while saving the photo.");
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-64 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-1">Progress Gallery</h2>
          <p className="text-sm text-zinc-400">Track your visual changes over time.</p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
          Add Photo
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <Camera className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-1">No Photos Yet</h3>
          <p className="text-sm text-zinc-500">Upload your first progress picture to start tracking your journey visually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group flex flex-col">
              <div className="aspect-[3/4] relative overflow-hidden bg-zinc-950">
                <img 
                  src={photo.imageUrl} 
                  alt={`Progress on ${photo.date}`} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-4 flex items-center justify-between border-t border-zinc-800">
                <span className="text-sm font-medium text-zinc-300">{photo.date}</span>
                {photo.bodyWeight > 0 ? (
                  <span className="text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800">
                    {photo.bodyWeight} kg
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-medium text-zinc-100">Upload Progress Photo</h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date Taken</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 [&::-webkit-calendar-picker-indicator]:invert"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Photo</label>
                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-zinc-800 border-dashed rounded-xl cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadIcon className="w-8 h-8 text-zinc-500 mb-3" />
                      <p className="text-sm text-zinc-400 font-medium">Click to select photo</p>
                      <p className="text-xs text-zinc-600 mt-1">JPEG, PNG</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-zinc-800">
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    {!uploading && (
                      <button 
                        onClick={() => { setPreviewUrl(null); setSelectedFile(null); }}
                        className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white p-1.5 rounded-lg hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              {uploading && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="w-4 h-4 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin" />
                  <span>Processing and saving...</span>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950">
              <button 
                onClick={closeModal}
                disabled={uploading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex items-center gap-2 px-5 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-zinc-900 rounded-full animate-spin" />
                ) : (
                  <SaveIcon className="w-4 h-4" />
                )}
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
