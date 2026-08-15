import React, { useState } from 'react';
import speciesData from '../data/jwe3_species.json';

export default function GenomeHub({ userGenomes, setUserGenomes, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSlider = (id, value) => {
    setUserGenomes((prev) => ({
      ...prev,
      [id]: parseInt(value, 10),
    }));
  };

  const handleSetAll = (value) => {
    if (window.confirm(`Set all species to ${value}% genome?`)) {
      const updated = {};
      speciesData.forEach((s) => {
        updated[s.id] = value;
      });
      setUserGenomes(updated);
    }
  };

  const filteredSpecies = speciesData.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: '#f3f4f6' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '2px solid #1f2937',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#14b8a6', fontSize: '24px' }}>
            🧬 Genome Collection Hub
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
            Track extraction progress. Species require 50% to synthesize.
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#374151',
            color: '#f3f4f6',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Back to Planner
        </button>
      </header>

      {/* Global Controls */}
      <div
        style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '25px',
          background: '#1f2937',
          padding: '15px',
          borderRadius: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search species..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            background: '#111827',
            border: '1px solid #374151',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: '6px',
            minWidth: '200px',
          }}
        />
        <button
          onClick={() => handleSetAll(100)}
          style={{
            background: '#14b8a622',
            color: '#14b8a6',
            border: '1px solid #14b8a6',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Set All 100%
        </button>
        <button
          onClick={() => handleSetAll(0)}
          style={{
            background: '#ef444422',
            color: '#ef4444',
            border: '1px solid #ef4444',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Reset All
        </button>
      </div>

      {/* Genome Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '15px',
        }}
      >
        {filteredSpecies.map((s) => {
          const currentProgress = userGenomes[s.id] || 0;
          const isSynthesizable = currentProgress >= 50;

          return (
            <div
              key={s.id}
              style={{
                background: '#1f2937',
                border: `1px solid ${isSynthesizable ? '#14b8a644' : '#374151'}`,
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <strong style={{ color: isSynthesizable ? '#f3f4f6' : '#9ca3af' }}>
                  {s.name}
                </strong>
                <span
                  style={{
                    color: isSynthesizable ? '#14b8a6' : '#ef4444',
                    fontWeight: 'bold',
                  }}
                >
                  {currentProgress}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={currentProgress}
                onChange={(e) => handleSlider(s.id, e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}