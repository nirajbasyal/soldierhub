"use client";

import { useEffect, useRef, useState } from "react";
import { compressPostImage, revokePreviewUrl } from "@/lib/media/imageCompression";
import { uploadCompressedImageToR2 } from "@/lib/media/upload";

export default function useComposerImage({ submittingValueRef, setError, setOpen, focusComposerField }) {
  const imageInputRef = useRef(null);
  const selectedImageRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageStatus, setImageStatus] = useState("");
  const [imageNotice, setImageNotice] = useState("");

  useEffect(() => {
    selectedImageRef.current = selectedImage;
  }, [selectedImage]);

  useEffect(() => {
    return () => revokePreviewUrl(selectedImageRef.current?.previewUrl);
  }, []);

  const clearSelectedImage = () => {
    setSelectedImage((current) => {
      revokePreviewUrl(current?.previewUrl);
      selectedImageRef.current = null;
      return null;
    });
    setImageStatus("");
    setImageNotice("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeSelectedImage = () => {
    if (submittingValueRef.current || imageProcessing) return;
    clearSelectedImage();
    focusComposerField?.();
  };

  const openImagePicker = () => {
    if (submittingValueRef.current || imageProcessing) return;
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    const file = files[0];
    if (event.target) event.target.value = "";
    if (!file) return;

    setError("");
    setImageNotice(
      files.length > 1 ? "Only one photo is allowed per post. We used the first selected photo." : ""
    );
    setImageStatus("Preparing photo…");
    setImageProcessing(true);

    try {
      const compressed = await compressPostImage(file);
      setSelectedImage((current) => {
        revokePreviewUrl(current?.previewUrl);
        selectedImageRef.current = compressed;
        return compressed;
      });
      setImageStatus("");
      setOpen(true);
    } catch (err) {
      setError(err?.message || "Could not prepare this image. Please try another photo.");
      setImageStatus("");
    } finally {
      setImageProcessing(false);
    }
  };

  const uploadSelectedImage = async () => {
    const imageToUpload = selectedImageRef.current;
    if (!imageToUpload) return null;
    setImageStatus("Uploading photo…");
    return uploadCompressedImageToR2(imageToUpload, { purpose: "post" });
  };

  return {
    imageInputRef,
    selectedImage,
    selectedImageRef,
    imageProcessing,
    imageStatus,
    setImageStatus,
    imageNotice,
    clearSelectedImage,
    removeSelectedImage,
    openImagePicker,
    handleImageSelected,
    uploadSelectedImage,
  };
}
