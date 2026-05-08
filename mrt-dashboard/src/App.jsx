import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Train, Info, Calendar, Clock, BarChart3, Map, Loader2 } from 'lucide-react';

const METRICS = [
  { id: 'total', name: '總人潮' },
  { id: 'entry', name: '進站' },
  { id: 'exit', name: '出站' }
];

const App = () => {
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('total');
  const [dayType, setDayType] = useState('weekday'); // weekday | weekend
  
  const [stationsIndex, setStationsIndex] = useState({});
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCell, setActiveCell] = useState(null);

  // Fetch stations index
  useEffect(() => {
    fetch('/data/stations.json')
      .then(res => res.json())
      .then(data => {
        setStationsIndex(data);
        // Find a default station (e.g. from Bannan line or first one)
        const groups = Object.keys(data);
        if (groups.length > 0) {
          const firstStation = data[groups[0]][0];
          if (firstStation) setSelectedStation(firstStation.id);
        }
      })
      .catch(err => {
        console.error('Failed to load stations index:', err);
        setError('無法載入車站清單');
      });
  }, []);

  // Fetch specific station data
  useEffect(() => {
    if (!selectedStation) return;
    
    setLoading(true);
    fetch(`/data/${selectedStation}.json`)
      .then(res => res.json())
      .then(data => {
        setStationData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load station data:', err);
        setError('無法載入車站數據');
        setLoading(false);
      });
    setActiveCell(null);
  }, [selectedStation]);

  const averages = stationData?.averages[dayType] || [];
  const heatmapData = stationData?.heatmap || [];
  const stationColor = '#3b82f6'; // Default color

  // Process heatmap into a 31x24 grid
  const heatmapGrid = useMemo(() => {
    const grid = [];
    const maxVal = Math.max(...heatmapData.map(d => d[selectedMetric]));
    
    // Group by date
    const dates = [...new Set(heatmapData.map(d => d.date))].sort();
    
    return {
      dates,
      maxVal
    };
  }, [heatmapData, selectedMetric]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}:00`}</p>
          <p className="value" style={{ color: payload[0].color }}>
            {`${METRICS.find(m => m.id === selectedMetric).name}: ${payload[0].value} 人次`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <header>
        <div className="logo">
          <Train size={32} />
          <h1>北捷人潮流量視覺化 <span>2026.03</span></h1>
        </div>
        <div className="controls">
          <div className="control-group">
            <label><Map size={16} /> 車站</label>
            <select 
              value={selectedStation} 
              onChange={(e) => {
                setSelectedStation(e.target.value);
                setActiveCell(null);
              }}
              className="station-select"
            >
              {Object.entries(stationsIndex).map(([groupName, stations]) => (
                <optgroup key={groupName} label={groupName}>
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label><BarChart3 size={16} /> 指標</label>
            <div className="segmented-control">
              {METRICS.map(m => (
                <button 
                  key={m.id} 
                  className={selectedMetric === m.id ? 'active' : ''}
                  onClick={() => {
                    setSelectedMetric(m.id);
                    setActiveCell(null);
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spinner" size={48} />
            <p>正在載入數據...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <Info size={32} />
            <p>{error}</p>
          </div>
        ) : (
          <>
            <section className="chart-section card">
              <div className="section-header">
                <h2><Clock size={20} /> 24 小時人潮趨勢</h2>
                <div className="day-selector">
                  <button 
                    className={dayType === 'weekday' ? 'active' : ''} 
                    onClick={() => setDayType('weekday')}
                  >
                    平日
                  </button>
                  <button 
                    className={dayType === 'weekend' ? 'active' : ''} 
                    onClick={() => setDayType('weekend')}
                  >
                    假日
                  </button>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={averages} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={stationColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={stationColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#888" 
                      tickFormatter={(val) => `${val}h`}
                    />
                    <YAxis stroke="#888" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey={selectedMetric} 
                      stroke={stationColor} 
                      fillOpacity={1} 
                      fill="url(#colorMetric)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="heatmap-section card">
              <div className="section-header">
                <h2><Calendar size={20} /> 整月人潮熱點圖 (Heatmap)</h2>
                <div className="legend-heatmap">
                  <span>少</span>
                  <div className="gradient-bar"></div>
                  <span>多</span>
                </div>
              </div>
              <div className="heatmap-container">
                <div className="heatmap-grid-wrapper">
                  <div className="hour-labels">
                    {Array.from({length: 24}).map((_, i) => (
                      <div key={i} className="hour-label">{i}h</div>
                    ))}
                  </div>
                  {heatmapGrid.dates.map(date => (
                    <div key={date} className="heatmap-row">
                      <div className="date-label">{date.split('-')[2]}</div>
                      <div className="cells">
                        {Array.from({length: 24}).map((_, h) => {
                          const point = heatmapData.find(d => d.date === date && d.hour === h);
                          const value = point ? point[selectedMetric] : 0;
                          const intensity = heatmapGrid.maxVal > 0 ? value / heatmapGrid.maxVal : 0;
                            return (
                              <div 
                                key={h} 
                                className={`cell ${activeCell?.date === date && activeCell?.hour === h ? 'active' : ''}`}
                                style={{ 
                                  backgroundColor: stationColor,
                                  opacity: 0.1 + intensity * 0.9 
                                }}
                                onClick={() => setActiveCell({ date, hour: h, value })}
                                title={`${date} ${h}h: ${value}人`}
                              ></div>
                            );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {activeCell && (
                  <div className="active-cell-info">
                    <span className="info-date">{activeCell.date.split('-')[1]}/{activeCell.date.split('-')[2]}</span>
                    <span className="info-time">{activeCell.hour}:00</span>
                    <span className="info-value">{activeCell.value.toLocaleString()} 人次</span>
                    <button className="close-info" onClick={() => setActiveCell(null)}>×</button>
                  </div>
                )}
              </div>
              <div className="heatmap-footer">
                <Info size={14} /> 垂直軸代表日期 (1-31日)，水平軸代表小時 (0-23時)
              </div>
            </section>
          </>
        )}
      </main>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: #0f1115;
          color: #e2e8f0;
          padding: 2rem;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1.5rem;
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(15, 17, 21, 0.8);
          backdrop-filter: blur(12px);
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .logo h1 span {
          color: #64748b;
          font-weight: 400;
          margin-left: 0.5rem;
          font-size: 1rem;
        }

        .controls {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .control-group label {
          font-size: 0.8rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .station-select {
          background: #1e293b;
          color: #fff;
          border: 1px solid #334155;
          padding: 0.5rem 2rem 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1rem;
          transition: border-color 0.2s;
        }

        .station-select:hover {
          border-color: #475569;
        }

        .station-select:focus {
          border-color: #3b82f6;
        }

        .segmented-control {
          background: #1e293b;
          padding: 0.25rem;
          border-radius: 0.5rem;
          display: flex;
          gap: 0.25rem;
        }

        .segmented-control button {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .segmented-control button.active {
          background: #334155;
          color: #fff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        main {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .card {
          background: #1a1d23;
          border: 1px solid #2d3748;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
          overflow: hidden; /* Prevent charts from spilling out */
          width: 100%;
          box-sizing: border-box;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #cbd5e1;
        }

        .day-selector {
          display: flex;
          gap: 0.5rem;
        }

        .day-selector button {
          background: #1e293b;
          border: 1px solid #334155;
          color: #94a3b8;
          padding: 0.4rem 1rem;
          border-radius: 2rem;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .day-selector button.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .chart-wrapper {
          padding-top: 1rem;
        }

        .custom-tooltip {
          background: #1e293b;
          border: 1px solid #334155;
          padding: 0.75rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }

        .custom-tooltip .label {
          margin: 0 0 0.25rem 0;
          font-weight: 600;
          color: #fff;
        }

        .custom-tooltip .value {
          margin: 0;
          font-size: 0.9rem;
        }

        .heatmap-container {
          overflow-x: auto;
          padding-bottom: 1rem;
          -webkit-overflow-scrolling: touch;
        }

        .heatmap-grid-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 600px; /* Ensure cells have readable width on mobile */
        }

        .hour-labels {
          display: flex;
          margin-left: 2rem;
          margin-bottom: 0.5rem;
        }

        .hour-label {
          width: 20px;
          flex-grow: 1;
          text-align: center;
          font-size: 0.7rem;
          color: #64748b;
        }

        .heatmap-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .date-label {
          width: 1.5rem;
          font-size: 0.7rem;
          color: #64748b;
          text-align: right;
        }

        .cells {
          display: flex;
          gap: 2px;
          flex-grow: 1;
        }

        .cell {
          height: 18px;
          flex-grow: 1;
          border-radius: 2px;
          transition: transform 0.1s;
        }

        .cell:hover {
          transform: scale(1.3);
          z-index: 10;
          box-shadow: 0 0 10px rgba(255,255,255,0.2);
        }

        .cell.active {
          outline: 2px solid #fff;
          outline-offset: 1px;
          z-index: 5;
        }

        .active-cell-info {
          margin-top: 1rem;
          background: #1e293b;
          border: 1px solid #334155;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.9rem;
          animation: slideUp 0.2s ease-out;
        }

        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .info-date { color: #94a3b8; }
        .info-time { font-weight: 600; color: #fff; }
        .info-value { color: #3b82f6; font-weight: 700; }
        .close-info { 
          margin-left: auto;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 1.2rem;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .cell:hover {
            transform: none; /* Disable hover on mobile */
          }
        }

        .heatmap-footer {
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legend-heatmap {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: #64748b;
        }

        .gradient-bar {
          width: 100px;
          height: 8px;
          background: linear-gradient(to right, #1e293b, #3b82f6);
          border-radius: 4px;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 1rem 0.5rem;
          }
          header {
            flex-direction: column;
            align-items: flex-start;
            padding: 1rem;
          }
          .logo h1 {
            font-size: 1.2rem;
          }
          .controls {
            width: 100%;
            gap: 1rem;
          }
          .control-group {
            width: 100%;
          }
          .segmented-control {
            width: 100%;
          }
          .segmented-control button {
            flex: 1;
            padding: 0.5rem 0.5rem;
            font-size: 0.8rem;
          }
          .card {
            padding: 1rem;
            border-radius: 0.5rem;
          }
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .day-selector {
            width: 100%;
          }
          .day-selector button {
            flex: 1;
          }
        }
        .loading-state, .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          background: #1a1d23;
          border-radius: 1rem;
          color: #94a3b8;
          gap: 1rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
          color: #3b82f6;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        optgroup {
          background: #0f1115;
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.8rem;
          padding: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default App;
