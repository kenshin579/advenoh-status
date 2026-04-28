// App shell — Glass variant only

const { useState, useEffect, useMemo } = React;

const PAGES = ['dashboard', 'history', 'admin'];

const EDIT_DEFAULTS = /*EDITMODE-BEGIN*/{
  "page": "dashboard",
  "showIncidents": true,
  "showResponseTimes": true,
  "neonIntensity": "medium",
  "scanlines": true,
  "glitch": true
}/*EDITMODE-END*/;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('advenoh-redesign') || '{}');
    return { ...EDIT_DEFAULTS, ...saved };
  } catch { return { ...EDIT_DEFAULTS }; }
}

function App() {
  const initial = loadState();
  const [page, setPage] = useState(initial.page);
  const [showIncidents, setShowIncidents] = useState(initial.showIncidents);
  const [showResponseTimes, setShowResponseTimes] = useState(initial.showResponseTimes);
  const [neonIntensity, setNeonIntensity] = useState(initial.neonIntensity);
  const [scanlines, setScanlines] = useState(initial.scanlines);
  const [glitch, setGlitch] = useState(initial.glitch);
  const [tweaksOn, setTweaksOn] = useState(false);

  useEffect(() => {
    localStorage.setItem('advenoh-redesign', JSON.stringify({
      page, showIncidents, showResponseTimes, neonIntensity, scanlines, glitch,
    }));
  }, [page, showIncidents, showResponseTimes, neonIntensity, scanlines, glitch]);

  useEffect(() => {
    function onMessage(e) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweaksOn(true);
      else if (e.data.type === '__deactivate_edit_mode') setTweaksOn(false);
    }
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const persistEdit = (patch) => {
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };

  const context = useMemo(() => ({
    services: window.SERVICES,
    summaryByDate: window.SUMMARY,
    incidents: window.INCIDENTS,
    page, setPage,
    showIncidents, showResponseTimes,
    neonIntensity, scanlines, glitch,
  }), [page, showIncidents, showResponseTimes, neonIntensity, scanlines, glitch]);

  return (
    <React.Fragment>
      <window.GlassVariant {...context} />

      {tweaksOn && (
        <div className="tweaks-panel">
          <h4>TWEAKS</h4>

          <div className="tweak-row">
            <span className="tweak-label">Page</span>
            <div className="tweak-btn-group">
              {PAGES.map(p => (
                <button
                  key={p}
                  className={`tweak-btn ${page===p?'active':''}`}
                  onClick={() => { setPage(p); persistEdit({page: p}); }}
                >{p}</button>
              ))}
            </div>
          </div>

          <div className="tweak-row">
            <span className="tweak-label">Neon intensity</span>
            <div className="tweak-btn-group">
              {['low','medium','high'].map(v => (
                <button key={v}
                  className={`tweak-btn ${neonIntensity===v?'active':''}`}
                  onClick={() => { setNeonIntensity(v); persistEdit({neonIntensity: v}); }}
                >{v}</button>
              ))}
            </div>
          </div>

          <div className="tweak-row">
            <span className="tweak-label">Effects</span>
            <button className={`tweak-toggle ${scanlines?'on':''}`}
              onClick={() => { const v=!scanlines; setScanlines(v); persistEdit({scanlines: v}); }}>
              <span>Scanlines</span><span>{scanlines ? 'ON' : 'OFF'}</span>
            </button>
            <div style={{height:6}} />
            <button className={`tweak-toggle ${glitch?'on':''}`}
              onClick={() => { const v=!glitch; setGlitch(v); persistEdit({glitch: v}); }}>
              <span>Glitch</span><span>{glitch ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="tweak-row">
            <span className="tweak-label">Sections</span>
            <button className={`tweak-toggle ${showIncidents?'on':''}`}
              onClick={() => { const v=!showIncidents; setShowIncidents(v); persistEdit({showIncidents: v}); }}>
              <span>Incidents</span><span>{showIncidents ? 'ON' : 'OFF'}</span>
            </button>
            <div style={{height:6}} />
            <button className={`tweak-toggle ${showResponseTimes?'on':''}`}
              onClick={() => { const v=!showResponseTimes; setShowResponseTimes(v); persistEdit({showResponseTimes: v}); }}>
              <span>Response sparkline</span><span>{showResponseTimes ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
