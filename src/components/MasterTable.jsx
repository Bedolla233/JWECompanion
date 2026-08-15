import React, { useState, useMemo } from 'react';
import speciesData from '../data/jwe3_species.json';

export default function MasterTable({ paddock, onAddSpecies, onClose }) {
  const [sortConfig, setSortConfig] = useState({ key: 'appealDensityHa', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');

  const checkCompatibility = (candidate) => {
    if (paddock.length === 0) return true;
    
    for (let p of paddock) {
      const resident = speciesData.find(s => s.id === p.speciesId);
      if (!resident) continue;

      const cDislikes = candidate.dislikes || [];
      const rDislikes = resident.dislikes || [];
      const rName = resident.name || "";
      const rFamily = resident.family || "";
      const cName = candidate.name || "";
      const cFamily = candidate.family || "";

      if (
        cDislikes.includes(rName) || 
        cDislikes.includes(rFamily) || 
        cDislikes.includes("Everything")
      ) return false;

      if (
        rDislikes.includes(cName) || 
        rDislikes.includes(cFamily) || 
        rDislikes.includes("Everything")
      ) return false;

      const cDiet = candidate.diet || "";
      const rDiet = resident.diet || "";
      const cIsCarnivore = cDiet.includes("Carnivore") || cDiet.includes("Piscivore");
      const rIsCarnivore = rDiet.includes("Carnivore") || rDiet.includes("Piscivore");
      
      const cLikes = candidate.likes || [];
      const rLikes = resident.likes || [];

      if (cDislikes.includes("Therizinosaurs & Carnivores") && rIsCarnivore) return false;
      if (rDislikes.includes("Therizinosaurs & Carnivores") && cIsCarnivore) return false;
      
      if (cIsCarnivore && rIsCarnivore && !cLikes.includes(rName) && !rLikes.includes(cName)) {
        return false;
      }
    }
    return true;
  };

  const formatHabitat = (terrainPercentages) => {
    if (!terrainPercentages) return 'None';
    return Object.entries(terrainPercentages)
      .filter(([_, ratio]) => ratio > 0)
      .map(([terrain, ratio]) => `${Math.round(ratio * 100)}% ${terrain.replace('_', ' ')}`)
      .join(', ');
  };

  const processSpeciesData = (species) => {
    const femaleVariant = species.variants?.female || {};
    const baseAppeal = femaleVariant.appeal || 0;
    const appealPerHectare = femaleVariant.appeal_per_hectare || 1;
    
    const totalAreaM2 = appealPerHectare > 0 ? (baseAppeal / appealPerHectare) * 10000 : 0;
    const totalAreaHa = totalAreaM2 / 10000;
    const appealDensityHa = totalAreaHa > 0 ? Math.round(baseAppeal / totalAreaHa) : 0;
    const isCompatible = checkCompatibility(species);
    const habitatStr = formatHabitat(species.terrain_percentages);

    return {
      ...species,
      name: species.name || "Unknown",
      family: species.family || "Unknown",
      diet: species.diet || "Unknown",
      baseAppeal,
      securityRating: species.security_rating || 1,
      likes: species.likes || [],
      dislikes: species.dislikes || [],
      totalAreaM2,
      totalAreaHa,
      appealDensityHa,
      isCompatible,
      habitatStr
    };
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredData = useMemo(() => {
    let filtered = speciesData
      .map(processSpeciesData)
      .filter((s) => 
        (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.family || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.diet || "").toLowerCase().includes(searchTerm.toLowerCase())
      );

    filtered.sort((a, b) => {
      if (typeof a[sortConfig.key] === 'boolean') {
        return sortConfig.direction === 'asc' 
          ? (a[sortConfig.key] === b[sortConfig.key] ? 0 : a[sortConfig.key] ? -1 : 1)
          : (a[sortConfig.key] === b[sortConfig.key] ? 0 : a[sortConfig.key] ? 1 : -1);
      }

      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [searchTerm, sortConfig, paddock]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span style={{ opacity: 0.3 }}> ↕</span>;
    return <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  return (
    <div style={{ background: '#1f2937', padding: '20px', borderRadius: '10px', border: '1px solid #374151' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#14b8a6', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Master Species Spreadsheet
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
            Compare base stats, security ratings, cohabitation, and area efficiency in Hectares (ha).
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <input
            type="text"
            placeholder="Search name, family, diet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: '#111827',
              border: '1px solid #374151',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: '#374151',
              color: '#f3f4f6',
              border: '1px solid #4b5563',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Return to Planner
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '70vh', borderRadius: '8px', border: '1px solid #374151' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead style={{ background: '#111827', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th onClick={() => handleSort('name')} style={thStyle}>Species <SortIcon columnKey="name" /></th>
              <th onClick={() => handleSort('isCompatible')} style={thStyle}>Compatible <SortIcon columnKey="isCompatible" /></th>
              <th onClick={() => handleSort('diet')} style={thStyle}>Diet <SortIcon columnKey="diet" /></th>
              <th style={thStyle}>Habitat Needs</th>
              <th style={thStyle}>Cohabitation & Interactions</th>
              <th onClick={() => handleSort('family')} style={thStyle}>Family <SortIcon columnKey="family" /></th>
              <th onClick={() => handleSort('baseAppeal')} style={thStyle}>Appeal <SortIcon columnKey="baseAppeal" /></th>
              <th onClick={() => handleSort('securityRating')} style={thStyle}>Security <SortIcon columnKey="securityRating" /></th>
              <th onClick={() => handleSort('totalAreaHa')} style={thStyle}>Base Area (ha) <SortIcon columnKey="totalAreaHa" /></th>
              <th onClick={() => handleSort('appealDensityHa')} style={thStyle}>Appeal / ha <SortIcon columnKey="appealDensityHa" /></th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredData.map((s, index) => {
              const inPaddock = paddock.some((p) => p.speciesId === s.id);
              return (
                <tr key={s.id || index} style={{ background: index % 2 === 0 ? '#1f2937' : '#111827', borderBottom: '1px solid #374151' }}>
                  <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      disabled={inPaddock}
                      onClick={() => onAddSpecies(s.id)}
                      style={{
                        background: inPaddock ? '#374151' : '#14b8a6',
                        color: inPaddock ? '#9ca3af' : '#111827',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: inPaddock ? 'not-allowed' : 'pointer',
                        fontSize: '11px',
                        minWidth: '65px'
                      }}
                    >
                      {inPaddock ? 'Added' : '+ Add'}
                    </button>
                    <b>{s.name}</b>
                  </td>

                  <td style={tdStyle}>
                    {s.isCompatible ? (
                      <span style={{ background: '#22c55e22', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                        Yes
                      </span>
                    ) : (
                      <span style={{ background: '#ef444422', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                        No
                      </span>
                    )}
                  </td>

                  <td style={{ ...tdStyle, color: '#d1d5db' }}>{s.diet}</td>

                  <td style={{ ...tdStyle, fontSize: '12px', color: '#38bdf8', minWidth: '180px', whiteSpace: 'normal', lineHeight: '1.4' }}>
                    {s.habitatStr}
                  </td>

                  <td style={{ ...tdStyle, fontSize: '12px', minWidth: '220px', whiteSpace: 'normal', lineHeight: '1.4' }}>
                    {s.likes.length > 0 && (
                      <div style={{ color: '#4ade80', marginBottom: '2px' }}>
                        <strong>Likes:</strong> {s.likes.join(', ')}
                      </div>
                    )}
                    {s.dislikes.length > 0 && (
                      <div style={{ color: '#f87171' }}>
                        <strong>Fights:</strong> {s.dislikes.join(', ')}
                      </div>
                    )}
                    {s.likes.length === 0 && s.dislikes.length === 0 && (
                      <span style={{ color: '#6b7280' }}>No specific preferences</span>
                    )}
                  </td>

                  <td style={{ ...tdStyle, color: '#9ca3af' }}>{s.family}</td>
                  <td style={{ ...tdStyle, color: '#14b8a6', fontWeight: 'bold' }}>{s.baseAppeal}</td>
                  <td style={{ ...tdStyle, color: '#f59e0b' }}>Lv. {s.securityRating}</td>
                  
                  <td style={tdStyle}>{s.totalAreaHa.toFixed(2)} ha</td>
                  <td style={{ ...tdStyle, color: '#f59e0b', fontWeight: 'bold' }}>
                    {s.appealDensityHa.toLocaleString()} <small style={{ color: '#9ca3af' }}>/ha</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 16px',
  color: '#f3f4f6',
  cursor: 'pointer',
  userSelect: 'none',
  borderBottom: '2px solid #374151',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle'
};

const tdStyle = {
  padding: '12px 16px',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle'
};