import DigSites from './components/DigSites';
import MasterTable from './components/MasterTable';
import React, { useState, useEffect } from 'react';
import speciesData from './data/jwe3_species.json';
import GenomeHub from './components/GenomeHub';
import {
  calculatePaddockSpace,
  findOptimalTankmates,
} from './utils/logicEngine';

export default function App() {
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
        speciesId: 'moros_intrepidus',
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

  const [activeView, setActiveView] = useState('planner'); 

  const [userGenomes, setUserGenomes] = useState(() => {
    const saved = localStorage.getItem('jwe3_user_genomes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const [completedSites, setCompletedSites] = useState(() => {
    const saved = localStorage.getItem('jwe3_completed_sites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('jwe3_completed_sites', JSON.stringify(completedSites));
  }, [completedSites]);

  const toggleSiteCompletion = (siteId) => {
    setCompletedSites((prev) => ({ ...prev, [siteId]: !prev[siteId] }));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [hideUnsynthesizable, setHideUnsynthesizable] = useState(false);

  useEffect(() => {
    localStorage.setItem('jwe3_paddock', JSON.stringify(paddock));
  }, [paddock]);

  useEffect(() => {
    localStorage.setItem('jwe3_user_genomes', JSON.stringify(userGenomes));
  }, [userGenomes]);

  const getGenome = (id) => userGenomes[id] || 0;
  const isSynthesizable = (id) => getGenome(id) >= 50;

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

  const summary = calculatePaddockSpace(paddock) || {};
  const recommendations = findOptimalTankmates(paddock) || [];

  const filteredSpecies = speciesData.filter((s) => {
    const matchesSearch = (s.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFamily =
      !familyFilter ||
      (s.family || "").toLowerCase().includes(familyFilter.toLowerCase());
    const matchesGenome = !hideUnsynthesizable || isSynthesizable(s.id);
    return matchesSearch && matchesFamily && matchesGenome;
  });

  const families = Array.from(new Set(speciesData.map((s) => s.family || "Unknown"))).sort();

  const formatTerrainBreakdown = (terrainPercentages) => {
    if (!terrainPercentages) return 'None specified';
    return Object.entries(terrainPercentages)
      .filter(([_, ratio]) => ratio > 0)
      .map(([terrain, ratio]) => `${Math.round(ratio * 100)}% ${terrain.replace('_', ' ')}`)
      .join(', ');
  };

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
      <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginBottom: '25px',
            borderBottom: '2px solid #1f2937',
            paddingBottom: '15px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, color: '#14b8a6', fontSize: '28px', lineHeight: '1.2' }}>
                Unofficial JWE Companion
              </h1>
            </div>
          </div>
          
          {/* Navigation Buttons Row - Uses flex-wrap for mobile safety */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            
            {/* Conditional Escape Hatch */}
            {activeView !== 'planner' && (
              <button
                onClick={() => setActiveView('planner')}
                style={{
                  flex: '1 1 auto',
                  background: '#14b8a6',
                  color: '#111827',
                  border: '1px solid #14b8a6',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}
              >
                ← Return to Planner
              </button>
            )}

            <button
              onClick={() => setActiveView('table')}
              style={{
                flex: '1 1 auto',
                background: activeView === 'table' ? '#14b8a6' : '#1f2937',
                color: activeView === 'table' ? '#111827' : '#14b8a6',
                border: activeView === 'table' ? '1px solid #14b8a6' : '1px solid #374151',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: activeView === 'table' ? 'default' : 'pointer',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}
            >
              Master Table
            </button>

            <button
              onClick={() => setActiveView('genomes')}
              style={{
                flex: '1 1 auto',
                background: activeView === 'genomes' ? '#14b8a6' : '#1f2937',
                color: activeView === 'genomes' ? '#111827' : '#14b8a6',
                border: activeView === 'genomes' ? '1px solid #14b8a6' : '1px solid #374151',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: activeView === 'genomes' ? 'default' : 'pointer',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}
            >
              Genome Hub
            </button>

            <button
              onClick={() => setActiveView('digsites')}
              style={{
                flex: '1 1 auto',
                background: activeView === 'digsites' ? '#14b8a6' : '#1f2937',
                color: activeView === 'digsites' ? '#111827' : '#14b8a6',
                border: activeView === 'digsites' ? '1px solid #14b8a6' : '1px solid #374151',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: activeView === 'digsites' ? 'default' : 'pointer',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}
            >
              Dig Sites
            </button>

            <button
              onClick={handleReset}
              style={{
                flex: '1 1 auto',
                background: '#374151',
                color: '#ef4444',
                border: '1px solid #4b5563',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}
            >
              Clear Enclosure
            </button>
          </div>
        </header>

        {activeView === 'genomes' ? (
          <GenomeHub
            userGenomes={userGenomes}
            setUserGenomes={setUserGenomes}
            onClose={() => setActiveView('planner')}
          />
        ) : activeView === 'table' ? (
          <MasterTable
            paddock={paddock}
            onAddSpecies={(id) => {
              handleAddSpecies(id);
              setActiveView('planner');
            }}
            onClose={() => setActiveView('planner')}
          />
        ) : activeView === 'digsites' ? (
          <DigSites
            paddock={paddock}
            completedSites={completedSites}
            toggleSiteCompletion={toggleSiteCompletion}
          />
        ) : (
          <div className="app-grid">
            <div>
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
                + Add Dinosaur (Search & Filter Database)
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
                    Click "+ Add Dinosaur" above to begin planning your habitat.
                  </p>
                </div>
              ) : (
                paddock.map(
                  ({ speciesId, femaleCount, maleCount, juvenileCount }) => {
                    const species = speciesData.find((s) => s.id === speciesId);
                    if (!species) return null;

                    // Compute area growth metrics for UI
                    const sociability = species.sociability ?? species.variants?.female?.sociability ?? 0.85;
                    const adultGrowthRate = Math.max(0, 1 - sociability);
                    const adultGrowthPercent = Math.round(adultGrowthRate * 100);

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
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {species.name}
                              {!isSynthesizable(speciesId) && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    background: '#f59e0b',
                                    color: '#111827',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    marginLeft: '10px',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  Needs 50% Genome
                                </span>
                              )}
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

                        <div
                          style={{
                            display: 'flex',
                            gap: '15px',
                            flexWrap: 'wrap',
                            marginBottom: '12px',
                          }}
                        >
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
                                Juvenile:
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

                        <div style={{ background: '#111827', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ color: '#f3f4f6', fontWeight: 'bold', marginBottom: '2px' }}>Variant Growth & Space Contribution:</div>
                          {femaleCount > 0 && species.variants?.female && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>
                                Females ({femaleCount}): {species.variants.female.appeal * femaleCount} Appeal
                                <span style={{ marginLeft: '6px', color: '#6b7280', fontSize: '11px' }}>[+{adultGrowthPercent}% Area Growth]</span>
                              </span>
                              <span style={{ color: '#14b8a6' }}>{((species.variants.female.appeal / (species.variants.female.appeal_per_hectare || 1)) * (1 + (femaleCount - 1) * adultGrowthRate)).toFixed(2)} ha</span>
                            </div>
                          )}
                          {maleCount > 0 && species.variants?.male && species.restrictions?.has_males && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>
                                Males ({maleCount}): {species.variants.male.appeal * maleCount} Appeal
                                <span style={{ marginLeft: '6px', color: '#6b7280', fontSize: '11px' }}>[+{adultGrowthPercent}% Area Growth]</span>
                              </span>
                              <span style={{ color: '#14b8a6' }}>{((species.variants.male.appeal / (species.variants.male.appeal_per_hectare || 1)) * (1 + (maleCount - 1) * adultGrowthRate)).toFixed(2)} ha</span>
                            </div>
                          )}
                          {juvenileCount > 0 && species.variants?.juvenile && species.restrictions?.has_juveniles && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>
                                Juveniles ({juvenileCount}): {species.variants.juvenile.appeal * juvenileCount} Appeal
                                <span style={{ marginLeft: '6px', color: '#6b7280', fontSize: '11px' }}>[+100% Area Growth]</span>
                              </span>
                              <span style={{ color: '#14b8a6' }}>{((species.variants.juvenile.appeal / (species.variants.juvenile.appeal_per_hectare || 1)) * juvenileCount).toFixed(2)} ha</span>
                            </div>
                          )}
                        </div>

                        {/* COMFORT WARNINGS UI */}
                        {summary?.comfortWarnings?.[speciesId]?.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {summary.comfortWarnings[speciesId].map((warning, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: '#ef444422',
                                  color: '#ef4444',
                                  border: '1px solid #ef444455',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                ⚠️ {warning}
                              </span>
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  }
                )
              )}
            </div>

            <div className="dashboard-col" style={{ position: 'sticky', top: '20px' }}>
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
                  <span
                    style={{
                      background:
                        summary?.synergyStatus?.code === 'RED'
                          ? '#ef4444'
                          : summary?.synergyStatus?.code === 'YELLOW'
                          ? '#f59e0b'
                          : '#22c55e',
                      color: '#111827',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    {summary?.synergyStatus?.badge || 'Pending'}
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
                      <b style={{ color: '#fff' }}>{summary?.totalAppeal || 0}</b>
                    </p>
                    <p
                      style={{
                        margin: '4px 0',
                        fontSize: '14px',
                        color: '#9ca3af',
                      }}
                    >
                      Dominance:{' '}
                      <b style={{ color: '#fff' }}>{summary?.totalDominance || 0}</b>
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#9ca3af' }}>
                      Area: <b style={{ color: '#fff' }}>{summary?.totalAreaHa || 0} ha</b> <small>({(summary?.totalAreaM2 || 0).toLocaleString()} m²)</small>
                    </p>
                  </div>
                  <div>
                    {summary?.feederBreakdown?.meat > 0 && (
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#9ca3af' }}>
                        Est. Meat Feeders: <b style={{ color: '#fff' }}>{summary.feederBreakdown.meat}</b>
                      </p>
                    )}
                    {summary?.feederBreakdown?.livePrey > 0 && (
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#9ca3af' }}>
                        Est. Live Feeders: <b style={{ color: '#fff' }}>{summary.feederBreakdown.livePrey}</b>
                      </p>
                    )}
                    {summary?.feederBreakdown?.fish > 0 && (
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#9ca3af' }}>
                        Est. Fish Feeders: <b style={{ color: '#fff' }}>{summary.feederBreakdown.fish}</b>
                      </p>
                    )}
                    {(!summary?.feederBreakdown?.meat && !summary?.feederBreakdown?.livePrey && !summary?.feederBreakdown?.fish) && (
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#9ca3af' }}>
                        Feeders: <b style={{ color: '#14b8a6' }}>0 (Herbivores)</b>
                      </p>
                    )}
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#f59e0b' }}>
                      Efficiency: <b>{summary?.appealDensity || 0}</b> <small>Appeal/ha</small>
                    </p>
                  </div>
                </div>

                {summary?.totalAreaM2 > 0 && summary?.envPercentages && (
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
                    Recommended Compatible Tankmates
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
                            {rec.family} • {rec.density || 0} Appeal/ha
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
        )}

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
                maxWidth: '650px',
                maxHeight: '80vh',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
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
                  X
                </button>
              </div>

              <div
                style={{
                  padding: '15px 20px',
                  background: '#111827',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={hideUnsynthesizable} 
                    onChange={(e) => setHideUnsynthesizable(e.target.checked)} 
                    style={{ width: '16px', height: '16px', accentColor: '#14b8a6' }}
                  />
                  Hide Un-Synthesizable (&lt; 50% Genome)
                </label>
              </div>

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
                  const femaleApp = s.variants?.female?.appeal || 0;
                  const secRating = s.security_rating || 1;
                  const habitatStr = formatTerrainBreakdown(s.terrain_percentages);

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
                        gap: '15px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <b style={{ color: '#f3f4f6', fontSize: '15px' }}>{s.name}</b>
                          <span style={{ fontSize: '12px', color: '#14b8a6', fontWeight: 'bold' }}>{s.family}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#9ca3af', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span>Diet: <strong style={{ color: '#d1d5db' }}>{s.diet || 'Unknown'}</strong></span>
                          <span>Security: <strong style={{ color: '#f59e0b' }}>Lv. {secRating}</strong></span>
                          <span>Appeal: <strong style={{ color: '#14b8a6' }}>{femaleApp}</strong></span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#38bdf8' }}>
                          <span>Habitat: </span><span style={{ color: '#94a3b8' }}>{habitatStr}</span>
                        </div>
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
                          whiteSpace: 'nowrap'
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