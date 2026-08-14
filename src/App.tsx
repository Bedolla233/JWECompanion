import React, { useState, useEffect } from 'react';
import speciesData from './data/jwe3_species.json';
import {
  calculatePaddockSpace,
  findOptimalTankmates,
} from './utils/logicEngine';

export default function App() {
  // LocalStorage Persistence
  const [paddock, setPaddock] = useState(() => {
    const saved = localStorage.getItem('jwe3_paddock');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { speciesId: 'baryonyx', femaleCount: 1, maleCount: 1, juvenileCount: 2 },
      {
        speciesId: 'morosintrepidus',
        femaleCount: 3,
        maleCount: 0,
        juvenileCount: 0,
      },
      {
        speciesId: 'brachiosaurus',
        femaleCount: 1,
        maleCount: 0,
        juvenileCount: 0,
      },
    ];
  });

  // Modal / Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');

  useEffect(() => {
    localStorage.setItem('jwe3_paddock', JSON.stringify(paddock));
  }, [paddock]);

  const handleAddSpecies = (speciesId) => {
    if (paddock.some((item) => item.speciesId === speciesId)) return;
    setPaddock([
      ...paddock,
      { speciesId, femaleCount: 1, maleCount: 0, juvenileCount: 0 },
    ]);
  };

  const handleCountChange = (speciesId, field, delta) => {
    setPaddock(
      paddock.map((item) => {
        if (item.speciesId === speciesId) {
          const current = item[field] || 0;
          return { ...item, [field]: Math.max(0, current + delta) };
        }
        return item;
      })
    );
  };

  const handleRemove = (speciesId) => {
    setPaddock(paddock.filter((item) => item.speciesId !== speciesId));
  };

  const handleReset = () => {
    if (window.confirm('Clear all dinosaurs from this enclosure?')) {
      setPaddock([]);
    }
  };

  const summary = calculatePaddockSpace(paddock);
  const recommendations = findOptimalTankmates(paddock);

  // Filter species for modal
  const filteredSpecies = speciesData.filter((s) => {
    const matchesSearch = s.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFamily =
      !familyFilter ||
      s.family.toLowerCase().includes(familyFilter.toLowerCase());
    return matchesSearch && matchesFamily;
  });

  const families = Array.from(new Set(speciesData.map((s) => s.family))).sort();

  return (
    <div
      style={{
        background: '#111827',
        minHeight: '100vh',
        color: '#f3f4f6',
        fontFamily: 'sans-serif',
        padding: '20px',
      }}
    >

      <style>{`
        .app-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 25px;
          align-items: start;
        }
        @media (max-width: 850px) {
          .app-grid {
            display: flex;
            flex-direction: column-reverse; 
          }
          .dashboard-col {
            position: static !important; 
            margin-bottom: 20px;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* HEADER */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            borderBottom: '2px solid #1f2937',
            paddingBottom: '15px',
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: '#14b8a6', fontSize: '28px' }}>
              🦖 JWE3 Habitat Planner
            </h1>
            <p
              style={{
                margin: '4px 0 0 0',
                color: '#9ca3af',
                fontSize: '14px',
              }}
            >
              Dark HUD Edition • Offline PWA
            </p>
          </div>
          <button
            onClick={handleReset}
            style={{
              background: '#374151',
              color: '#ef4444',
              border: '1px solid #4b5563',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🗑️ Clear Enclosure
          </button>
        </header>

        {/* MAIN COMMAND CENTER GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '25px',
            alignItems: 'start',
          }}
        >
          {/* LEFT COLUMN: Population Controls */}
          <div>
            {/* Open Drawer Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                width: '100%',
                background: '#14b8a6',
                color: '#111827',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '20px',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              }}
            >
              ➕ Add Dinosaur (Search & Filter Database)
            </button>

            <h2
              style={{
                fontSize: '20px',
                margin: '0 0 15px 0',
                color: '#e5e7eb',
              }}
            >
              Current Population
            </h2>

            {paddock.length === 0 ? (
              <div
                style={{
                  background: '#1f2937',
                  padding: '30px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#9ca3af',
                }}
              >
                <p style={{ margin: 0 }}>Enclosure is currently empty.</p>
                <p style={{ fontSize: '13px', margin: '8px 0 0 0' }}>
                  Click "Add Dinosaur" above to begin planning your habitat.
                </p>
              </div>
            ) : (
              paddock.map(
                ({ speciesId, femaleCount, maleCount, juvenileCount }) => {
                  const species = speciesData.find((s) => s.id === speciesId);
                  if (!species) return null;

                  return (
                    <div
                      key={speciesId}
                      style={{
                        background: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '15px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: '18px',
                              color: '#f3f4f6',
                            }}
                          >
                            {species.name}
                          </h3>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#14b8a6',
                              fontWeight: 'bold',
                            }}
                          >
                            {species.family}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemove(speciesId)}
                          style={{
                            background: '#ef444422',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      {/* TOUCH STEPPER CONTROLS */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '15px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Females */}
                        <div
                          style={{
                            background: '#111827',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                            Females:
                          </span>
                          <button
                            onClick={() =>
                              handleCountChange(speciesId, 'femaleCount', -1)
                            }
                            style={stepperBtnStyle}
                          >
                            -
                          </button>
                          <span
                            style={{
                              fontWeight: 'bold',
                              minWidth: '18px',
                              textAlign: 'center',
                            }}
                          >
                            {femaleCount}
                          </span>
                          <button
                            onClick={() =>
                              handleCountChange(speciesId, 'femaleCount', 1)
                            }
                            style={stepperBtnStyle}
                          >
                            +
                          </button>
                        </div>

                        {/* Males */}
                        {species.restrictions?.has_males ? (
                          <div
                            style={{
                              background: '#111827',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span
                              style={{ fontSize: '13px', color: '#9ca3af' }}
                            >
                              Male:
                            </span>
                            <button
                              onClick={() =>
                                handleCountChange(speciesId, 'maleCount', -1)
                              }
                              style={stepperBtnStyle}
                            >
                              -
                            </button>
                            <span
                              style={{
                                fontWeight: 'bold',
                                minWidth: '18px',
                                textAlign: 'center',
                              }}
                            >
                              {maleCount}
                            </span>
                            <button
                              onClick={() =>
                                handleCountChange(speciesId, 'maleCount', 1)
                              }
                              style={stepperBtnStyle}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              background: '#111827',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#6b7280',
                            }}
                          >
                            Female Only
                          </div>
                        )}

                        {/* Juveniles */}
                        {species.restrictions?.has_juveniles ? (
                          <div
                            style={{
                              background: '#111827',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span
                              style={{ fontSize: '13px', color: '#9ca3af' }}
                            >
                              Juvinile:
                            </span>
                            <button
                              onClick={() =>
                                handleCountChange(
                                  speciesId,
                                  'juvenileCount',
                                  -1
                                )
                              }
                              style={stepperBtnStyle}
                            >
                              -
                            </button>
                            <span
                              style={{
                                fontWeight: 'bold',
                                minWidth: '18px',
                                textAlign: 'center',
                              }}
                            >
                              {juvenileCount}
                            </span>
                            <button
                              onClick={() =>
                                handleCountChange(speciesId, 'juvenileCount', 1)
                              }
                              style={stepperBtnStyle}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              background: '#111827',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#6b7280',
                            }}
                          >
                            No Juveniles
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* RIGHT COLUMN: STICKY DASHBOARD & RECOMMENDER */}
          <div className="dashboard-col" style={{ position: 'sticky', top: '20px' }}>
            {/* Live Summary Card */}
            <div
              style={{
                background: '#1f2937',
                border: '1px solid #374151',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '15px',
                }}
              >
                <h2 style={{ margin: 0, fontSize: '20px' }}>
                  📊 Live Enclosure Summary
                </h2>
                <span
                  style={{
                    background:
                      summary.synergyStatus.code === 'RED'
                        ? '#ef4444'
                        : '#22c55e',
                    color: '#111827',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  {summary.synergyStatus.badge}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: '#111827',
                  padding: '14px',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <p
                    style={{
                      margin: '4px 0',
                      fontSize: '14px',
                      color: '#9ca3af',
                    }}
                  >
                    Total Appeal:{' '}
                    <b style={{ color: '#fff' }}>{summary.totalAppeal}</b>
                  </p>
                  <p
                    style={{
                      margin: '4px 0',
                      fontSize: '14px',
                      color: '#9ca3af',
                    }}
                  >
                    Dominance:{' '}
                    <b style={{ color: '#fff' }}>{summary.totalDominance}</b>
                  </p>
                  <p
                    style={{
                      margin: '4px 0',
                      fontSize: '14px',
                      color: '#9ca3af',
                    }}
                  >
                    Area:{' '}
                    <b style={{ color: '#fff' }}>
                      {summary.totalAreaM2.toLocaleString()} m²
                    </b>
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: '4px 0',
                      fontSize: '14px',
                      color: '#9ca3af',
                    }}
                  >
                    Meat Feeders:{' '}
                    <b style={{ color: '#fff' }}>
                      {summary.feederBreakdown.meat}
                    </b>
                  </p>
                  <p
                    style={{
                      margin: '4px 0',
                      fontSize: '14px',
                      color: '#9ca3af',
                    }}
                  >
                    Fish Feeders:{' '}
                    <b style={{ color: '#fff' }}>
                      {summary.feederBreakdown.fish}
                    </b>
                  </p>
                  <p
                    style={{
                      margin: '4px 0',
                      fontSize: '14px',
                      color: '#f59e0b',
                    }}
                  >
                    ⚡ Density: <b>{summary.appealDensity}</b>{' '}
                    <small>Appeal/m²</small>
                  </p>
                </div>
              </div>

              {/* Terrain Progress Bars */}
              {summary.totalAreaM2 > 0 && (
                <div style={{ marginTop: '18px' }}>
                  <h4
                    style={{
                      margin: '0 0 10px 0',
                      color: '#9ca3af',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Terrain Needs:
                  </h4>
                  {Object.entries(summary.envPercentages).map(
                    ([terrain, percent]) => (
                      <div key={terrain} style={{ marginBottom: '8px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            marginBottom: '3px',
                            textTransform: 'capitalize',
                          }}
                        >
                          <span>
                            {terrain} (
                            {summary.envBreakdownM2[terrain].toLocaleString()}{' '}
                            m²)
                          </span>
                          <span
                            style={{ fontWeight: 'bold', color: '#14b8a6' }}
                          >
                            {percent}%
                          </span>
                        </div>
                        <div
                          style={{
                            background: '#111827',
                            borderRadius: '4px',
                            height: '6px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              background: '#14b8a6',
                              width: `${percent}%`,
                              height: '100%',
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 💡 SMART TANKMATE RECOMMENDER */}
            {paddock.length > 0 && recommendations.length > 0 && (
              <div
                style={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  padding: '18px',
                  borderRadius: '10px',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '16px',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  💡 Recommended Compatible Tankmates
                </h3>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        background: '#111827',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#f3f4f6',
                          }}
                        >
                          {rec.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          {rec.family} • {rec.density} Appeal/m²
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddSpecies(rec.id)}
                        style={{
                          background: '#14b8a622',
                          color: '#14b8a6',
                          border: '1px solid #14b8a6',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🔍 SEARCH & FILTER DRAWER MODAL */}
        {isModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#1f2937',
                border: '1px solid #374151',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '80vh',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #374151',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ margin: 0, color: '#14b8a6' }}>
                  Dinosaur Database Search
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    fontSize: '20px',
                    cursor: 'pointer',
                  }}
                >
                  ✖
                </button>
              </div>

              {/* Filters Bar */}
              <div
                style={{
                  padding: '15px 20px',
                  background: '#111827',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <input
                  type="text"
                  placeholder="Search species name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                  }}
                />
                <select
                  value={familyFilter}
                  onChange={(e) => setFamilyFilter(e.target.value)}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">All Categories</option>
                  {families.map((fam) => (
                    <option key={fam} value={fam}>
                      {fam}
                    </option>
                  ))}
                </select>
              </div>

              {/* Species List */}
              <div
                style={{
                  overflowY: 'auto',
                  padding: '15px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {filteredSpecies.map((s) => {
                  const inPaddock = paddock.some((p) => p.speciesId === s.id);

                  return (
                    <div
                      key={s.id}
                      style={{
                        background: '#111827',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <b style={{ color: '#f3f4f6' }}>{s.name}</b>
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#9ca3af',
                            marginLeft: '10px',
                          }}
                        >
                          ({s.family})
                        </span>
                      </div>
                      <button
                        disabled={inPaddock}
                        onClick={() => {
                          handleAddSpecies(s.id);
                          setIsModalOpen(false);
                        }}
                        style={{
                          background: inPaddock ? '#374151' : '#14b8a6',
                          color: inPaddock ? '#9ca3af' : '#111827',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          cursor: inPaddock ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {inPaddock ? 'In Enclosure' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stepper Button Style helper
const stepperBtnStyle = {
  background: '#374151',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  width: '36px',       
  height: '36px',      
  fontSize: '18px',    
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
};
