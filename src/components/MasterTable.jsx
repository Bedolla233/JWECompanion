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
    if (sortConfig.key !== columnKey) return <span className="opacity-30"> ↕</span>;
    return <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  return (
    <div className="bg-gray-800 p-4 md:p-5 rounded-xl border border-gray-700 w-full text-left">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-5 gap-4">
        <div>
          <h2 className="m-0 text-teal-400 flex items-center gap-2 text-xl font-bold">
            Master Species Spreadsheet
          </h2>
          <p className="mt-1 text-gray-400 text-sm">
            Compare base stats, security ratings, cohabitation, and area efficiency in Hectares (ha).
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search name, family, diet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-md focus:outline-none focus:border-teal-500 w-full sm:w-auto"
          />
          <button
            onClick={onClose}
            className="bg-gray-700 text-gray-100 border border-gray-600 px-4 py-2 rounded-md font-bold hover:bg-gray-600 transition-colors whitespace-nowrap"
          >
            Return to Planner
          </button>
        </div>
      </div>

      {/* MOBILE VIEW: STACKED CARDS */}
      <div className="block md:hidden space-y-3 max-h-[75vh] overflow-y-auto pb-4 pr-1">
        {sortedAndFilteredData.map((s, index) => {
          const inPaddock = paddock.some((p) => p.speciesId === s.id);
          return (
            <div key={s.id || index} className="bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    {s.name}
                    {s.isCompatible ? (
                      <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold uppercase">
                        OK
                      </span>
                    ) : (
                      <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold uppercase">
                        Fight
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400">{s.family} • {s.diet}</p>
                </div>
                
                <button
                  disabled={inPaddock}
                  onClick={() => onAddSpecies(s.id)}
                  className={`px-3 py-1.5 rounded-md font-bold text-sm min-w-[70px] ${
                    inPaddock ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-teal-500 text-gray-900 cursor-pointer hover:bg-teal-400'
                  }`}
                >
                  {inPaddock ? 'Added' : '+ Add'}
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

              {/* Habitat & Cohab Info for Mobile */}
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
      <div className="hidden md:block overflow-x-auto max-h-[70vh] rounded-lg border border-gray-700 custom-scrollbar">
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
                      disabled={inPaddock}
                      onClick={() => onAddSpecies(s.id)}
                      className={`px-2.5 py-1.5 rounded text-xs font-bold min-w-[65px] ${
                        inPaddock ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-teal-500 text-gray-900 cursor-pointer hover:bg-teal-400'
                      }`}
                    >
                      {inPaddock ? 'Added' : '+ Add'}
                    </button>
                    <b className="text-white">{s.name}</b>
                  </td>

                  <td className="p-3">
                    {s.isCompatible ? (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
                        Yes
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