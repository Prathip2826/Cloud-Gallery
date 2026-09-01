import { useState, useEffect, useCallback } from 'react';
import { Photo, SortOption, FilterOption } from '../types';
import { photosService } from '../services/photos';

export function usePhotos(isAuthenticated: boolean) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  const fetchPhotos = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await photosService.listPhotos({
        sort,
        search,
        filter: filter === 'all' ? undefined : filter,
      });
      setPhotos(data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch photos from DynamoDB');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, sort, search, filter]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const deletePhoto = async (photoId: string) => {
    try {
      await photosService.deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.photoId !== photoId));
      if (selectedPhoto?.photoId === photoId) {
        setSelectedPhoto(null);
      }
      setSelectedPhotoIds((prev) => prev.filter((id) => id !== photoId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete photo');
    }
  };

  const toggleFavorite = async (photoId: string) => {
    const photo = photos.find((p) => p.photoId === photoId);
    if (!photo) return;
    const newFav = !photo.isFavorite;

    // Optimistic UI update
    setPhotos((prev) =>
      prev.map((p) => (p.photoId === photoId ? { ...p, isFavorite: newFav } : p))
    );
    if (selectedPhoto?.photoId === photoId) {
      setSelectedPhoto((prev) => (prev ? { ...prev, isFavorite: newFav } : null));
    }

    try {
      await photosService.updatePhoto(photoId, { isFavorite: newFav });
    } catch {
      // Revert on error
      setPhotos((prev) =>
        prev.map((p) => (p.photoId === photoId ? { ...p, isFavorite: !newFav } : p))
      );
    }
  };

  const updateCaption = async (photoId: string, caption: string, tags?: string[]) => {
    try {
      const updated = await photosService.updatePhoto(photoId, { caption, tags });
      setPhotos((prev) => prev.map((p) => (p.photoId === photoId ? updated : p)));
      if (selectedPhoto?.photoId === photoId) {
        setSelectedPhoto(updated);
      }
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update caption');
    }
  };

  const downloadOriginal = async (photo: Photo) => {
    try {
      const { downloadUrl, fileName } = await photosService.getDownloadUrl(photo.photoId);
      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || photo.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to generate secure download URL');
    }
  };

  const seedSamplePhotos = async () => {
    setIsLoading(true);
    try {
      await photosService.seedDemoPhotos();
      await fetchPhotos();
    } catch (err: any) {
      setError(err.message || 'Failed to seed sample photos');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectPhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const clearSelection = () => {
    setSelectedPhotoIds([]);
  };

  const selectAll = () => {
    setSelectedPhotoIds(photos.map((p) => p.photoId));
  };

  return {
    photos,
    isLoading,
    error,
    search,
    setSearch,
    sort,
    setSort,
    filter,
    setFilter,
    selectedPhoto,
    setSelectedPhoto,
    selectedPhotoIds,
    toggleSelectPhoto,
    clearSelection,
    selectAll,
    fetchPhotos,
    deletePhoto,
    toggleFavorite,
    updateCaption,
    downloadOriginal,
    seedSamplePhotos,
  };
}
