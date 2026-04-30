import iconPng from '../../resources/icon.png';
import useAppVersion from '../hooks/useAppVersion';

const GITHUB_REPO_URL = 'https://github.com/im-red/expiration_reminder';

interface AboutPageProps {
  onBack: () => void;
}

function AboutPage({ onBack }: AboutPageProps) {
  const { fullString: versionString } = useAppVersion();

  const handleViewWebsite = () => {
    window.open(GITHUB_REPO_URL, '_blank');
  };

  return (
    <div className="settings-container about-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100 }}>
      <header className="app-header">
        <button className="btn-back" style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }} onClick={onBack}>←</button>
        <div className="header-title">
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>About</h1>
        </div>
      </header>

      <div className="settings-content">
        <div className="about-app-info">
          <img className="about-app-icon" src={iconPng} alt="Expiration Reminder" />
          <div className="about-app-name">Expiration Reminder</div>
          <div className="about-app-version">{versionString}</div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Information</div>
          <button className="settings-item settings-item--clickable" onClick={handleViewWebsite}>
            <div className="settings-item-icon">🌐</div>
            <div className="settings-item-content">
              <div className="settings-item-label">View Website</div>
              <div className="settings-item-hint">GitHub Repository</div>
            </div>
            <div className="settings-item-arrow">›</div>
          </button>
          <div className="settings-item">
            <div className="settings-item-icon">📄</div>
            <div className="settings-item-content">
              <div className="settings-item-label">License</div>
              <div className="settings-item-value">MIT License</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
