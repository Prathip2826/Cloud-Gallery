import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePhotos } from './hooks/usePhotos';
import { useUpload } from './hooks/useUpload';
import { useCloudEvents } from './hooks/useCloudEvents';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { SearchBar } from './components/gallery/SearchBar';
import { PhotoGrid } from './components/gallery/PhotoGrid';
import { UploadModal } from './components/upload/UploadModal';
import { PhotoViewer } from './components/viewer/PhotoViewer';
import { ArchitectureVisualizer } from './components/cloud/ArchitectureVisualizer';
import { CloudConsoleView } from './components/cloud/CloudConsoleView';
import { SettingsView } from './components/settings/SettingsView';
import { ViewMode, Photo } from './types';
import { Loader2, HardDrive, Image as ImageIcon, ShieldCheck, Zap } from 'lucide-react';

export function App() {
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    isSigningIn,
    error: authError,
    loginWithGoogle,
    logout,
    isConfigured,
    configStatus,
  } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentTab, setCurrentTab] = useState<string>('gallery');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);

  const {
    photos,
    isLoading: isPhotosLoading,
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
  } = usePhotos(isAuthenticated);

  const {
    queue,
    isUploading,
    isModalOpen: isUploadOpen,
    setIsModalOpen: setIsUploadOpen,
    addFiles,
    removeQueueItem,
    updateItemCaption,
    clearCompleted,
    clearAll,
    processQueue,
  } = useUpload(() => {
    fetchPhotos();
    cloudEvents.refresh();
  });

  const cloudEvents = useCloudEvents();

  // If initial auth check is running
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-mono">Initializing CloudGallery authentication...</p>
      </div>
    );
  }

  // If not authenticated, render Login / Signup (Both use Continue with Google flow)
  if (!isAuthenticated) {
    if (authMode === 'signup') {
      return (
        <Signup
          onLoginWithGoogle={loginWithGoogle}
          onSwitchToLogin={() => setAuthMode('login')}
          isLoading={isAuthLoading}
          isSigningIn={isSigningIn}
          error={authError}
        />
      );
    }
    return (
      <Login
        onLoginWithGoogle={loginWithGoogle}
        onSwitchToSignup={() => setAuthMode('signup')}
        isLoading={isAuthLoading}
        isSigningIn={isSigningIn}
        error={authError}
      />
    );
  }

  // Filter photos based on current tab if it's 'favorites' or 'recent'
  const displayedPhotos = photos.filter((photo) => {
    if (currentTab === 'favorites') return photo.isFavorite;
    if (currentTab === 'recent') {
      const now = new Date().getTime();
      const photoTime = new Date(photo.uploadedAt).getTime();
      return now - photoTime <= 7 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

  const handleBatchDelete = async () => {
    if (selectedPhotoIds.length === 0) return;
    if (
      window.confirm(
        `Delete ${selectedPhotoIds.length} selected photos?\nThis will permanently remove them from S3 and DynamoDB.`
      )
    ) {
      for (const id of selectedPhotoIds) {
        await deletePhoto(id);
      }
      clearSelection();
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'favorites':
        return 'Favorite Photos';
      case 'recent':
        return 'Recent Uploads (7 Days)';
      case 'architecture':
        return 'AWS Cloud Architecture';
      case 'console':
        return 'Cloud Live Stream';
      case 'settings':
        return 'Cloud & Account Settings';
      default:
        return 'My Photo Gallery';
    }
  };

  const getTabSubtitle = () => {
    switch (currentTab) {
      case 'favorites':
        return 'Quick access to your starred memories across the cloud.';
      case 'recent':
        return 'Photos uploaded within the last week.';
      case 'architecture':
        return 'Firebase Auth, API Gateway, Lambda, S3, DynamoDB, Sharp, CloudFront CDN.';
      case 'console':
        return 'Real-time telemetry and execution logs across all provisioned services.';
      case 'settings':
        return 'Manage your Firebase account, S3 buckets, and DynamoDB configuration.';
      default:
        return 'Securely managed with AWS S3 & DynamoDB';
    }
  };

  const formatStorageMB = (bytes: number) => {
    if (!bytes) return '0.00 MB';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        user={user}
        onLogout={logout}
        cloudStats={cloudEvents.stats}
        isOpenMobile={isOpenMobileSidebar}
        setIsOpenMobile={setIsOpenMobileSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen relative pb-14">
        {/* Header */}
        <Header
          title={getTabTitle()}
          subtitle={getTabSubtitle()}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
          search={search}
          setSearch={setSearch}
          user={user}
          onSeedDemo={seedSamplePhotos}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenArchitecture={() => setCurrentTab('architecture')}
        />

        {/* Top Cloud Metrics Overview Bar (for gallery tabs) */}
        {(currentTab === 'gallery' || currentTab === 'favorites' || currentTab === 'recent') && (
          <section className="px-4 sm:px-8 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Metric 1: Storage */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 flex-shrink-0">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Storage Used</p>
                  <p className="text-xl font-bold text-slate-900 truncate">
                    {formatStorageMB(cloudEvents.stats?.totalStorageBytes || 0)} / 10 GB
                  </p>
                </div>
              </div>

              {/* Metric 2: Photos */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Assets</p>
                  <p className="text-xl font-bold text-slate-900 truncate">
                    {photos.length} {photos.length === 1 ? 'Asset' : 'Assets'}
                  </p>
                </div>
              </div>

              {/* Metric 3: Cloud Identity */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cloud Identity</p>
                  <p className="text-xl font-bold text-slate-900 truncate font-mono text-sm sm:text-base">
                    Firebase UID: {user?.id?.slice(0, 10) || 'user'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-8 w-full mx-auto">
          {(currentTab === 'gallery' || currentTab === 'favorites' || currentTab === 'recent') && (
            <div>
              {/* Filter and Search Bar */}
              <SearchBar
                search={search}
                setSearch={setSearch}
                sort={sort}
                setSort={setSort}
                filter={filter}
                setFilter={setFilter}
                totalCount={displayedPhotos.length}
                selectedCount={selectedPhotoIds.length}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                onBatchDelete={handleBatchDelete}
              />

              {/* Photos Grid */}
              <PhotoGrid
                photos={displayedPhotos}
                isLoading={isPhotosLoading}
                viewMode={viewMode}
                onViewPhoto={(photo) => setSelectedPhoto(photo)}
                onDownloadPhoto={downloadOriginal}
                onDeletePhoto={deletePhoto}
                onToggleFavorite={toggleFavorite}
                onUpload={() => setIsUploadOpen(true)}
                onSeedDemo={seedSamplePhotos}
                filterType={currentTab}
                isSearch={!!search.trim()}
                onClearFilter={() => {
                  setSearch('');
                  setFilter('all');
                }}
                selectedPhotoIds={selectedPhotoIds}
                onToggleSelectPhoto={toggleSelectPhoto}
                onEditCaption={(photo) => setSelectedPhoto(photo)}
              />
            </div>
          )}

          {currentTab === 'architecture' && (
            <ArchitectureVisualizer
              stats={cloudEvents.stats}
              architecture={cloudEvents.architecture}
            />
          )}

          {currentTab === 'console' && (
            <CloudConsoleView
              events={cloudEvents.events}
              isLiveActive={cloudEvents.isLiveActive}
              setIsLiveActive={cloudEvents.setIsLiveActive}
              onRefresh={cloudEvents.refresh}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView user={user} stats={cloudEvents.stats} />
          )}
        </main>

        {/* Sleek Telemetry Footer */}
        <footer className="h-12 bg-slate-50 border-t border-slate-200 px-4 sm:px-8 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-bold fixed bottom-0 left-0 right-0 lg:left-64 z-20">
          <div className="flex gap-4 sm:gap-6 items-center">
            <span className="hidden sm:inline">AWS Lambda Edge: us-east-1</span>
            <span>S3 Replication: Active</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              DynamoDB Online
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Firebase Auth Valid
            </span>
          </div>
        </footer>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        queue={queue}
        isUploading={isUploading}
        onAddFiles={addFiles}
        onRemoveItem={removeQueueItem}
        onUpdateCaption={updateItemCaption}
        onProcessQueue={processQueue}
        onClearCompleted={clearCompleted}
        onClearAll={clearAll}
      />

      {/* Photo Viewer Lightbox */}
      <PhotoViewer
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onDownload={downloadOriginal}
        onDelete={deletePhoto}
        onToggleFavorite={toggleFavorite}
        onUpdateCaption={updateCaption}
        allPhotos={displayedPhotos}
        onSelectPhoto={(photo) => setSelectedPhoto(photo)}
      />
    </div>
  );
}
export default App;
