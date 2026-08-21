import React, { useState, useMemo } from 'react';
import speciesData from '../data/jwe3_species.json';

export default function MasterTable({ paddock, onAddSpecies, onClose, theme }) {
  const t = theme || {
    bgMain: '#111827',
    bgCard: '#1f2937',
    textMain: '#f3f4f6',
    border: '#374151',
    primary: '#14b8a6'
  };
  const [sortConfig, setSortConfig] = useState({ key: 'appealDensityHa', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [dietFilter, setDietFilter] = useState('');
  
  const [imageSources, setImageSources] = useState({});

  const getFamilySlug = (familyName) => {
    const f = (familyName || '').toLowerCase();
    if (f.includes('carnivore') || f.includes('raptor') || f.includes('theropod')) return 'carnivore';
    if (f.includes('sauropod')) return 'sauropod';
    if (f.includes('ankylosaur')) return 'ankylosaurid';
    if (f.includes('stegosaur')) return 'stegosaurid';
    if (f.includes('ceratops')) return 'ceratopsid';
    if (f.includes('hadrosaur')) return 'hadrosaurid';
    if (f.includes('ornithomim')) return 'ornithomimosaurid';
    if (f.includes('pachycephalosaur')) return 'pachycephalosaurid';
    if (f.includes('therapsid')) return 'therapsid';
    if (f.includes('scavenger')) return 'scavenger';
    return 'herbivore';
  };

  const getImageUrl = (s) => {
    return imageSources[s.id] || `/images/species/${s.id}.webp`;
  };

  const handleImageError = (s) => {
    const current = imageSources[s.id] || `/images/species/${s.id}.webp`;
    
    if (current.includes('/images/species/')) {
      const familySlug = getFamilySlug(s.family);
      setImageSources(prev => ({ ...prev, [s.id]: `/images/families/${familySlug}.webp` }));
    } 
    else if (!current.includes('dino_icon.webp')) {
      setImageSources(prev => ({ ...prev, [s.id]: '/images/families/dino_icon.webp' }));
    }
  };

  const activeResident = paddock.length > 0 ? speciesData.find(s => s.id === paddock[0].speciesId) : null;
  const activeHabitat = activeResident ? (activeResident.habitat || 'terrestrial') : null;

  const families = Array.from(new Set(speciesData.map(s => s.family || "Unknown"))).sort();
  const dietCategories = ['Carnivore', 'Herbivore', 'Piscivore', 'Omnivore', 'Scavenger', 'Live Prey'];

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

  // Helper to extract clean alphabetical strings of terrain keys for sorting
  const getHabitatSortString = (terrainPercentages) => {
    if (!terrainPercentages) return '';
    return Object.entries(terrainPercentages)
      .filter(([k, ratio]) => ratio > 0 && k !== 'prestige_area_ratio')
      .map(([k]) => k)
      .sort()
      .join(',');
  };

  const processSpeciesData = (species) => {
    let femaleVariant = {};
    if (Array.isArray(species.variants)) {
      femaleVariant = species.variants.find((v) => v.variant === 'female') || species.variants[0] || {};
    } else {
      femaleVariant = species.variants?.female || species.variants?.male || {};
    }

    const baseAppeal = femaleVariant.appeal || femaleVariant.prestige_base || 0;
    const appealPerHectare = femaleVariant.appeal_per_hectare || 1;
    
    const totalAreaM2 = appealPerHectare > 0 ? (baseAppeal / appealPerHectare) * 10000 : 0;
    const totalAreaHa = totalAreaM2 / 10000;
    const appealDensityHa = totalAreaHa > 0 ? Math.round(baseAppeal / totalAreaHa) : 0;
    
    const terrainData = species.terrain_percentages || femaleVariant.environment;
    const habitatStr = formatHabitat(terrainData);
    const habitatSortKey = getHabitatSortString(terrainData); // Used invisibly for sorting

    const candidateHabitat = species.habitat || 'terrestrial';
    const habitatMismatch = activeHabitat ? candidateHabitat !== activeHabitat : false;
    const isCompatible = !habitatMismatch && checkCompatibility(species);

    return {
      ...species,
      name: species.name || "Unknown",
      family: species.family || "Unknown",
      diet: species.diet || "Unknown",
      baseAppeal,
      securityRating: species.security_rating || femaleVariant.security_rating || 1,
      likes: species.likes || [],
      dislikes: species.dislikes || [],
      totalAreaM2,
      totalAreaHa,
      appealDensityHa,
      isCompatible,
      habitatMismatch,
      habitatStr,
      habitatSortKey // Injected for the sorting engine
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
        ((s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.family || "").toLowerCase().includes(searchTerm.toLowerCase())) &&
        (familyFilter === '' || (s.family || "").toLowerCase() === familyFilter.toLowerCase()) &&
        (dietFilter === '' || (s.diet || "").toLowerCase().includes(dietFilter.toLowerCase()))
      );

    filtered.sort((a, b) => {
      // 1. BOOLEANS (e.g. isCompatible)
      if (typeof a[sortConfig.key] === 'boolean') {
        return sortConfig.direction === 'asc' 
          ? (a[sortConfig.key] === b[sortConfig.key] ? 0 : a[sortConfig.key] ? -1 : 1)
          : (a[sortConfig.key] === b[sortConfig.key] ? 0 : a[sortConfig.key] ? 1 : -1);
      }

      // 2. STRINGS & NUMBERS (including habitatSortKey which we extracted)
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [searchTerm, familyFilter, dietFilter, sortConfig, paddock]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="opacity-30"> ↕</span>;
    return <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  return (
    <div style={{ background: theme?.bgCard || '#1f2937', padding: '16px', borderRadius: '12px', border: `1px solid ${theme?.border || '#374151'}`, width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', color: theme?.textMain || '#f3f4f6' }}>
      
      {/* HEADER & CONTROLS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: theme?.primary || '#14b8a6', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 'bold' }}>
              Master Species Spreadsheet
            </h2>
            <p style={{ marginTop: '4px', color: theme?.textMuted || '#9ca3af', fontSize: '14px', marginBottom: 0 }}>
              Compare base stats, security ratings, cohabitation, and area efficiency.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: theme?.border || '#374151', width: '100%', maxWidth: 'auto', color: theme?.textMain || '#f3f4f6', border: `1px solid ${theme?.border || '#374151'}`, padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Return to Planner
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: theme?.bgSubCard || '#111827', padding: '12px', borderRadius: '8px', border: `1px solid ${theme?.border || '#374151'}` }}>
          
          <input
            type="text"
            placeholder="Search name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: theme?.bgCard || '#1f2937', border: `1px solid ${theme?.border || '#374151'}`, color: theme?.textMain || '#f3f4f6', padding: '8px 12px', borderRadius: '6px', outline: 'none', width: '100%', fontSize: '14px' }}
          />
          
          <select 
            value={familyFilter} 
            onChange={(e) => setFamilyFilter(e.target.value)}
            style={{ background: theme?.bgCard || '#1f2937', border: `1px solid ${theme?.border || '#374151'}`, color: theme?.textMain || '#f3f4f6', padding: '8px 12px', borderRadius: '6px', outline: 'none', width: '100%', fontSize: '14px' }}
          >
            <option value="">All Families</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          
          <select 
            value={dietFilter} 
            onChange={(e) => setDietFilter(e.target.value)}
            style={{ background: theme?.bgCard || '#1f2937', border: `1px solid ${theme?.border || '#374151'}`, color: theme?.textMain || '#f3f4f6', padding: '8px 12px', borderRadius: '6px', outline: 'none', width: '100%', fontSize: '14px' }}
          >
            <option value="">All Diets</option>
            {dietCategories.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
  
          <div style={{ display: 'flex', gap: '8px' }} className="md:hidden">
            <select 
              value={sortConfig.key} 
              onChange={(e) => setSortConfig({...sortConfig, key: e.target.value})}
              style={{ background: theme?.bgCard || '#1f2937', border: `1px solid ${theme?.border || '#374151'}`, color: theme?.textMain || '#f3f4f6', padding: '8px 12px', borderRadius: '6px', outline: 'none', width: '100%', fontSize: '14px' }}
            >
              <option value="name">Sort: Name</option>
              <option value="habitatSortKey">Sort: Habitat Match</option>
              <option value="appealDensityHa">Sort: Density/ha</option>
              <option value="baseAppeal">Sort: Base Appeal</option>
              <option value="totalAreaHa">Sort: Base Area</option>
              <option value="securityRating">Sort: Security</option>
            </select>
            <button 
              onClick={() => setSortConfig({...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}
              style={{ background: theme?.border || '#374151', border: `1px solid ${theme?.border || '#374151'}`, color: theme?.textMain || '#f3f4f6', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {sortConfig.direction === 'asc' ? '↑' : '↓'}
            </button>
          </div>
  
        </div>
      </div>
  
      {/* MOBILE VIEW: STACKED CARDS */}
      <div className="block md:hidden custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingBottom: '16px', paddingRight: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedAndFilteredData.map((s, index) => {
            const inPaddock = paddock.some((p) => p.speciesId === s.id);
            return (
              <div key={s.id || index} style={{ background: theme?.bgSubCard || '#111827', border: `1px solid ${theme?.border || '#374151'}`, padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                      src={getImageUrl(s)} 
                      alt={s.name} 
                      loading="lazy"
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0, background: theme?.border || '#374151' }}
                      onError={() => handleImageError(s)}
                    />
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: theme?.textMain || '#f3f4f6', marginBottom: '4px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        {s.name}
                        {s.isCompatible ? (
                          <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            OK
                          </span>
                        ) : s.habitatMismatch ? (
                          <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            Wrong Habitat
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            Fight
                          </span>
                        )}
                      </h3>
                      <p style={{ fontSize: '13px', color: theme?.textMuted || '#9ca3af', margin: 0 }}>{s.family} • {s.diet}</p>
                    </div>
                  </div>
                  
                  <button
                    disabled={inPaddock || s.habitatMismatch}
                    onClick={() => onAddSpecies(s.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      minWidth: '70px',
                      border: s.habitatMismatch ? '1px solid rgba(153, 27, 27, 0.5)' : 'none',
                      background: inPaddock 
                        ? theme?.border || '#374151' 
                        : s.habitatMismatch
                          ? 'rgba(127, 29, 29, 0.4)'
                          : theme?.primary || '#14b8a6',
                      color: inPaddock || s.habitatMismatch ? theme?.textMuted || '#9ca3af' : theme?.bgMain || '#111827',
                      cursor: inPaddock || s.habitatMismatch ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {inPaddock ? 'Added' : s.habitatMismatch ? 'Blocked' : '+ Add'}
                  </button>
                </div>
  
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme?.border || '#374151'}`, fontSize: '13px' }}>
                  <div>
                    <span style={{ color: theme?.textMuted || '#9ca3af', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Appeal</span>
                    <span style={{ color: theme?.primary || '#14b8a6', fontWeight: 'bold' }}>{s.baseAppeal}</span>
                  </div>
                  <div>
                    <span style={{ color: theme?.textMuted || '#9ca3af', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Density</span>
                    <span style={{ color: theme?.accent || '#f59e0b', fontWeight: 'bold' }}>{s.appealDensityHa.toLocaleString()} <span style={{ color: theme?.textMuted || '#9ca3af', fontSize: '11px' }}>/ha</span></span>
                  </div>
                  <div>
                    <span style={{ color: theme?.textMuted || '#9ca3af', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Base Area</span>
                    <span style={{ color: theme?.textMain || '#f3f4f6' }}>{s.totalAreaHa.toFixed(2)} ha</span>
                  </div>
                  <div>
                    <span style={{ color: theme?.textMuted || '#9ca3af', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Security</span>
                    <span style={{ color: theme?.accent || '#f59e0b' }}>Lv. {s.securityRating}</span>
                  </div>
                </div>
  
                <div style={{ marginTop: '12px', background: theme?.bgCard || '#1f2937', borderRadius: '6px', padding: '8px', fontSize: '12px' }}>
                  <p style={{ color: '#38bdf8', lineHeight: '1.3', margin: '0 0 4px 0' }}>
                    <strong>Habitat:</strong> {s.habitatStr}
                  </p>
                  <div style={{ lineHeight: '1.3' }}>
                    {s.likes.length > 0 && (
                      <div style={{ color: '#4ade80', marginBottom: '4px' }}><strong>Likes:</strong> {s.likes.join(', ')}</div>
                    )}
                    {s.dislikes.length > 0 && (
                      <div style={{ color: '#f87171' }}><strong>Fights:</strong> {s.dislikes.join(', ')}</div>
                    )}
                    {s.likes.length === 0 && s.dislikes.length === 0 && (
                      <span style={{ color: theme?.textMuted || '#9ca3af' }}>No specific preferences</span>
                    )}
                  </div>
                </div>
  
              </div>
            );
          })}
        </div>
      </div>
  
      {/* DESKTOP VIEW: STANDARD SPREADSHEET */}
      <div className="hidden md:block custom-scrollbar flex-grow" style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${theme?.border || '#374151'}`, maxHeight: 'calc(100vh - 200px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', whiteSpace: 'nowrap' }}>
          <thead style={{ background: theme?.bgCard || '#1f2937', position: 'sticky', top: 0, zIndex: 10, color: theme?.textMain || '#f3f4f6', borderBottom: `2px solid ${theme?.border || '#374151'}` }}>
            <tr>
              <th onClick={() => handleSort('name')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Species <SortIcon columnKey="name" /></th>
              <th onClick={() => handleSort('isCompatible')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Compatible <SortIcon columnKey="isCompatible" /></th>
              <th onClick={() => handleSort('diet')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Diet <SortIcon columnKey="diet" /></th>
              <th onClick={() => handleSort('habitatSortKey')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Habitat Needs <SortIcon columnKey="habitatSortKey" /></th>
              <th style={{ padding: '12px' }}>Cohabitation & Interactions</th>
              <th onClick={() => handleSort('family')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Family <SortIcon columnKey="family" /></th>
              <th onClick={() => handleSort('baseAppeal')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Appeal <SortIcon columnKey="baseAppeal" /></th>
              <th onClick={() => handleSort('securityRating')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Security <SortIcon columnKey="securityRating" /></th>
              <th onClick={() => handleSort('totalAreaHa')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Base Area (ha) <SortIcon columnKey="totalAreaHa" /></th>
              <th onClick={() => handleSort('appealDensityHa')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>Appeal / ha <SortIcon columnKey="appealDensityHa" /></th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredData.map((s, index) => {
              const inPaddock = paddock.some((p) => p.speciesId === s.id);
              const rowBg = index % 2 === 0 ? (theme?.bgSubCard || '#111827') : (theme?.bgCard || '#1f2937');
              return (
                <tr key={s.id || index} style={{ background: rowBg, borderBottom: `1px solid ${theme?.border || '#374151'}` }}>
                  <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      disabled={inPaddock || s.habitatMismatch}
                      onClick={() => onAddSpecies(s.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        minWidth: '65px',
                        border: s.habitatMismatch ? '1px solid rgba(153, 27, 27, 0.5)' : 'none',
                        background: inPaddock 
                          ? theme?.border || '#374151' 
                          : s.habitatMismatch
                            ? 'rgba(127, 29, 29, 0.4)'
                            : theme?.primary || '#14b8a6',
                        color: inPaddock || s.habitatMismatch ? theme?.textMuted || '#9ca3af' : theme?.bgMain || '#111827',
                        cursor: inPaddock || s.habitatMismatch ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {inPaddock ? 'Added' : s.habitatMismatch ? 'Blocked' : '+ Add'}
                    </button>
                    <img 
                      src={getImageUrl(s)} 
                      alt={s.name} 
                      loading="lazy"
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0, background: theme?.border || '#374151' }}
                      onError={() => handleImageError(s)}
                    />
                    <b style={{ color: theme?.textMain || '#f3f4f6' }}>{s.name}</b>
                  </td>
  
                  <td style={{ padding: '12px' }}>
                    {s.isCompatible ? (
                      <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        Yes
                      </span>
                    ) : s.habitatMismatch ? (
                      <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }} title="Incompatible Enclosure Habitat">
                        Habitat Clashes
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        No
                      </span>
                    )}
                  </td>
  
                  <td style={{ padding: '12px', color: theme?.textMuted || '#9ca3af' }}>{s.diet}</td>
  
                  <td style={{ padding: '12px', color: '#38bdf8', fontSize: '12px', minWidth: '180px', whiteSpace: 'normal', lineHeight: '1.3' }}>
                    {s.habitatStr}
                  </td>
  
                  <td style={{ padding: '12px', fontSize: '12px', minWidth: '220px', whiteSpace: 'normal', lineHeight: '1.3' }}>
                    {s.likes.length > 0 && (
                      <div style={{ color: '#4ade80', marginBottom: '2px' }}><strong>Likes:</strong> {s.likes.join(', ')}</div>
                    )}
                    {s.dislikes.length > 0 && (
                      <div style={{ color: '#f87171' }}><strong>Fights:</strong> {s.dislikes.join(', ')}</div>
                    )}
                    {s.likes.length === 0 && s.dislikes.length === 0 && (
                      <span style={{ color: theme?.textMuted || '#9ca3af' }}>No specific preferences</span>
                    )}
                  </td>
  
                  <td style={{ padding: '12px', color: theme?.textMuted || '#9ca3af' }}>{s.family}</td>
                  <td style={{ padding: '12px', color: theme?.primary || '#14b8a6', fontWeight: 'bold' }}>{s.baseAppeal}</td>
                  <td style={{ padding: '12px', color: theme?.accent || '#f59e0b' }}>Lv. {s.securityRating}</td>
                  
                  <td style={{ padding: '12px', color: theme?.textMuted || '#9ca3af' }}>{s.totalAreaHa.toFixed(2)} ha</td>
                  <td style={{ padding: '12px', color: theme?.accent || '#f59e0b', fontWeight: 'bold' }}>
                    {s.appealDensityHa.toLocaleString()} <small style={{ color: theme?.textMuted || '#9ca3af' }}>/ha</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}