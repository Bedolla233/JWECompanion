import React, { useState, useMemo } from 'react';
import speciesData from '../data/jwe3_species.json';

export default function MasterTable({ paddock, onAddSpecies, onClose }) {
  const [sortConfig, setSortConfig] = useState({ key: 'appealDensityHa', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [dietFilter, setDietFilter] = useState('');
  
  const [imageFailures, setImageFailures] = useState({});

  const handleImageError = (id) => {
    setImageFailures(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const getImageUrl = (s) => {
    const fails = imageFailures[s.id] || 0;
    if (fails === 0) return `/images/species/${s.id}.webp`;
    if (fails === 1) {
      const familySlug = (s.family || 'herbivore').toLowerCase().replace(/\s+/g, '_');
      return `/images/families/${familySlug}.webp`;
    }
    return '/images/families/dino_icon.webp';
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
    const habitatStr = formatHabitat(species.terrain_percentages || femaleVariant.environment);

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
        ((s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.family || "").toLowerCase().includes(searchTerm.toLowerCase())) &&
        (familyFilter === '' || (s.family || "").toLowerCase() === familyFilter.toLowerCase()) &&
        (dietFilter === '' || (s.diet || "").toLowerCase().includes(dietFilter.toLowerCase()))
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
  }, [searchTerm, familyFilter, dietFilter, sortConfig, paddock]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="opacity-30"> ↕</span>;
    return <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  return (
    <div className="bg-gray-800 p-4 md:p-5 rounded-xl border border-gray-700 w-full text-left flex flex-col h-full">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col gap-4 mb-5">
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="m-0 text-teal-400 flex items-center gap-2 text-xl font-bold">
              Master Species Spreadsheet
            </h2>
            <p className="mt-1 text-gray-400 text-sm">
              Compare base stats, security ratings, cohabitation, and area efficiency.
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-700 w-full sm:w-auto text-gray-100 border border-gray-600 px-4 py-2 rounded-md font-bold hover:bg-gray-600 transition-colors whitespace-nowrap shadow-sm"
          >
            Return to Planner
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-gray-900 p-3 rounded-lg border border-gray-700">
          
          <input
            type="text"
            placeholder="Search name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:border-teal-500 w-full text-sm"
          />
          
          <select 
            value={familyFilter} 
            onChange={(e) => setFamilyFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:border-teal-500 w-full text-sm"
          >
            <option value="">All Families</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          
          <select 
            value={dietFilter} 
            onChange={(e) => setDietFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:border-teal-500 w-full text-sm"
          >
            <option value="">All Diets</option>
            {dietCategories.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="flex gap-2 md:hidden">
            <select 
              value={sortConfig.key} 
              onChange={(e) => setSortConfig({...sortConfig, key: e.target.value})}
              className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:border-teal-500 w-full text-sm"
            >
              <option value="name">Sort: Name</option>
              <option value="appealDensityHa">Sort: Density/ha</option>
              <option value="baseAppeal">Sort: Base Appeal</option>
              <option value="totalAreaHa">Sort: Base Area</option>
              <option value="securityRating">Sort: Security</option>
            </select>
            <button 
              onClick={() => setSortConfig({...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}
              className="bg-gray-700 border border-gray-500 text-white px-3 py-2 rounded-md font-bold"
            >
              {sortConfig.direction === 'asc' ? '↑' : '↓'}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE VIEW: STACKED CARDS */}
      <div className="block md:hidden space-y-3 overflow-y-auto pb-4 pr-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {sortedAndFilteredData.map((s, index) => {
          const inPaddock = paddock.some((p) => p.speciesId === s.id);
          return (
            <div key={s.id || index} className="bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={getImageUrl(s)} 
                    alt={s.name} 
                    loading="lazy"
                    style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                    className="bg-gray-700"
                    onError={() => handleImageError(s.id)}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center flex-wrap gap-2">
                      {s.name}
                      {s.isCompatible ? (
                        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold uppercase">
                          OK
                        </span>
                      ) : s.habitatMismatch ? (
                        <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold uppercase">
                          Wrong Habitat
                        </span>
                      ) : (
                        <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold uppercase">
                          Fight
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400">{s.family} • {s.diet}</p>
                  </div>
                </div>
                
                <button
                  disabled={inPaddock || s.habitatMismatch}
                  onClick={() => onAddSpecies(s.id)}
                  className={`px-3 py-1.5 rounded-md font-bold text-sm min-w-[70px] ${
                    inPaddock 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : s.habitatMismatch
                        ? 'bg-red-900/40 text-red-400 cursor-not-allowed border border-red-800/50'
                        : 'bg-teal-500 text-gray-900 cursor-pointer hover:bg-teal-400'
                  }`}
                >
                  {inPaddock ? 'Added' : s.habitatMismatch ? 'Blocked' : '+ Add'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-800 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Appeal</span>
                  <span className="text-teal-400 font-bold">{s.baseAppeal}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Density</span>
                  <span className="text-amber-500 font-bold">{s.appealDensityHa.toLocaleString()} <span className="text-gray-500 text-xs">/ha</span></span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Base Area</span>
                  <span className="text-gray-300">{s.totalAreaHa.toFixed(2)} ha</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Security</span>
                  <span className="text-amber-500">Lv. {s.securityRating}</span>
                </div>
              </div>

              <div className="mt-3 bg-gray-800 rounded p-2 text-xs">
                <p className="text-sky-400 leading-tight mb-1">
                  <strong>Habitat:</strong> {s.habitatStr}
                </p>
                <div className="leading-tight">
                  {s.likes.length > 0 && (
                    <div className="text-green-400 mb-1"><strong>Likes:</strong> {s.likes.join(', ')}</div>
                  )}
                  {s.dislikes.length > 0 && (
                    <div className="text-red-400"><strong>Fights:</strong> {s.dislikes.join(', ')}</div>
                  )}
                  {s.likes.length === 0 && s.dislikes.length === 0 && (
                    <span className="text-gray-500">No specific preferences</span>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW: STANDARD SPREADSHEET */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-700 custom-scrollbar flex-grow" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-900 sticky top-0 z-10 text-gray-100 border-b-2 border-gray-700">
            <tr>
              <th onClick={() => handleSort('name')} className="p-3 cursor-pointer select-none hover:bg-gray-800 transition-colors">Species <SortIcon columnKey="name" /></th>
              <th onClick={() => handleSort('isCompatible')} className="p-3 cursor-pointer select-none hover:bg-gray-800 transition-colors">Compatible <SortIcon columnKey="isCompatible" /></th>
              <th onClick={() => handleSort('diet')} className="p-3 cursor-pointer select-none hover:bg-gray-800 transition-colors">Diet <SortIcon columnKey="diet" /></th>
              <th className="p-3">Habitat Needs</th>
              <th className="p-3">Cohabitation & Interactions</th>
              <th onClick={() => handleSort('family')} className="p-3 cursor-pointer select-none hover:bg-gray-800 transition-colors">Family <SortIcon columnKey="family" /></th>
              <th onClick={() => handleSort('baseAppeal')} className="p-3 cursor-pointer select-none hover:bg-gray-800 transition-colors">Appeal <SortIcon columnKey="baseAppeal" /></th>
              <th onClick={() => handleSort('securityRating')} className="p-3 cursor-pointer select-none hover:bg-gray-800 transition-colors">Security <SortIcon columnKey="securityRating" /></th>
              <th onClick={() => handleSort('totalAreaHa')} className="p-3 cursor-pointer select-none hover:bg-gray-800 transition-colors">Base Area (ha) <SortIcon columnKey="totalAreaHa" /></th>
              <th onClick={() => handleSort('appealDensityHa')} className="p-3 cursor-pointer select-none hover:bg-gray-800 transition-colors">Appeal / ha <SortIcon columnKey="appealDensityHa" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedAndFilteredData.map((s, index) => {
              const inPaddock = paddock.some((p) => p.speciesId === s.id);
              return (
                <tr key={s.id || index} className={`${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'} hover:bg-gray-700 transition-colors`}>
                  <td className="p-3 flex items-center gap-3">
                    <button
                      disabled={inPaddock || s.habitatMismatch}
                      onClick={() => onAddSpecies(s.id)}
                      className={`px-2.5 py-1.5 rounded text-xs font-bold min-w-[65px] ${
                        inPaddock 
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                          : s.habitatMismatch
                            ? 'bg-red-900/40 text-red-400 cursor-not-allowed border border-red-800/50'
                            : 'bg-teal-500 text-gray-900 cursor-pointer hover:bg-teal-400'
                      }`}
                    >
                      {inPaddock ? 'Added' : s.habitatMismatch ? 'Blocked' : '+ Add'}
                    </button>
                    <img 
                      src={getImageUrl(s)} 
                      alt={s.name} 
                      loading="lazy"
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                      className="bg-gray-700"
                      onError={() => handleImageError(s.id)}
                    />
                    <b className="text-white">{s.name}</b>
                  </td>

                  <td className="p-3">
                    {s.isCompatible ? (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
                        Yes
                      </span>
                    ) : s.habitatMismatch ? (
                      <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs font-bold" title="Incompatible Enclosure Habitat">
                        Habitat Clashes
                      </span>
                    ) : (
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">
                        No
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-gray-300">{s.diet}</td>

                  <td className="p-3 text-sky-400 text-xs min-w-[180px] whitespace-normal leading-tight">
                    {s.habitatStr}
                  </td>

                  <td className="p-3 text-xs min-w-[220px] whitespace-normal leading-tight">
                    {s.likes.length > 0 && (
                      <div className="text-green-400 mb-0.5"><strong>Likes:</strong> {s.likes.join(', ')}</div>
                    )}
                    {s.dislikes.length > 0 && (
                      <div className="text-red-400"><strong>Fights:</strong> {s.dislikes.join(', ')}</div>
                    )}
                    {s.likes.length === 0 && s.dislikes.length === 0 && (
                      <span className="text-gray-500">No specific preferences</span>
                    )}
                  </td>

                  <td className="p-3 text-gray-400">{s.family}</td>
                  <td className="p-3 text-teal-400 font-bold">{s.baseAppeal}</td>
                  <td className="p-3 text-amber-500">Lv. {s.securityRating}</td>
                  
                  <td className="p-3 text-gray-300">{s.totalAreaHa.toFixed(2)} ha</td>
                  <td className="p-3 text-amber-500 font-bold">
                    {s.appealDensityHa.toLocaleString()} <small className="text-gray-400">/ha</small>
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