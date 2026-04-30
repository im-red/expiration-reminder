import { useState } from 'react';
import useAppVersion from '../hooks/useAppVersion';

const GITHUB_RELEASES_URL = 'https://github.com/im-red/expiration-reminder/releases';

interface SettingsPageProps {
  onBack: () => void;
  onViewAbout: () => void;
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

function SettingsPage({ onBack, onViewAbout }: SettingsPageProps) {
  const [checking, setChecking] = useState(false);
  const { versionName: currentVersion, fullString: versionString } = useAppVersion();
  const [updateModal, setUpdateModal] = useState<{
    show: boolean;
    hasUpdate: boolean;
    latestVersion: string;
    currentVersion: string;
  }>({ show: false, hasUpdate: false, latestVersion: '', currentVersion: '' });

  const handleCheckUpdate = async () => {
    setChecking(true);
    try {
      const response = await fetch('https://api.github.com/repos/im-red/expiration-reminder/releases/latest');
      const data = await response.json();
      const latestVersion = data.tag_name?.replace(/^v/, '') || '';

      if (!latestVersion) {
        setUpdateModal({
          show: true,
          hasUpdate: false,
          latestVersion: '',
          currentVersion,
        });
        return;
      }

      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
      setUpdateModal({
        show: true,
        hasUpdate,
        latestVersion,
        currentVersion,
      });
    } catch {
      alert('Failed to check for updates. Please check your network connection.');
    } finally {
      setChecking(false);
    }
  };

  const handleViewRelease = () => {
    window.open(GITHUB_RELEASES_URL, '_blank');
    setUpdateModal(prev => ({ ...prev, show: false }));
  };

  return (
    <div className="settings-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100 }}>
      <header className="app-header">
        <button className="btn-back" style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }} onClick={onBack}>←</button>
        <div className="header-title">
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Settings</h1>
        </div>
      </header>

      <div className="settings-content">
        <div className="settings-section">
          <button className="settings-item settings-item--clickable" onClick={handleCheckUpdate} disabled={checking}>
            <div className="settings-item-icon">🔄</div>
            <div className="settings-item-content">
              <div className="settings-item-label">{checking ? 'Checking...' : 'Check for Updates'} <span className="settings-item-version">{versionString}</span></div>
            </div>
            <div className="settings-item-arrow">›</div>
          </button>
          <button className="settings-item settings-item--clickable" onClick={onViewAbout}>
            <div className="settings-item-icon">ℹ️</div>
            <div className="settings-item-content">
              <div className="settings-item-label">About</div>
            </div>
            <div className="settings-item-arrow">›</div>
          </button>
        </div>
      </div>

      {updateModal.show && (
        <div className="overlay" onClick={() => setUpdateModal(prev => ({ ...prev, show: false }))}>
          <div className="overlay__panel" onClick={(e) => e.stopPropagation()}>
            <div className="update-modal-body">
              <div className="update-modal-icon">{updateModal.hasUpdate ? '🆕' : '✅'}</div>
              {updateModal.hasUpdate ? (
                <>
                  <h2 className="update-modal-title">New Version Available</h2>
                  <p className="update-modal-text">
                    Latest Version: v{updateModal.latestVersion}<br />
                    Current Version: v{updateModal.currentVersion}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="update-modal-title">Up to Date</h2>
                  <p className="update-modal-text">
                    Current Version: v{updateModal.currentVersion}
                  </p>
                </>
              )}
              <div className="update-modal-buttons">
                <button className={updateModal.hasUpdate ? 'btn-primary' : 'btn-secondary'} onClick={handleViewRelease}>
                  {updateModal.hasUpdate ? 'View Update' : 'View Releases'}
                </button>
                <button className="btn-secondary" onClick={() => setUpdateModal(prev => ({ ...prev, show: false }))}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
