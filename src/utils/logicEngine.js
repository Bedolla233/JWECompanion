import speciesData from '../data/jwe3_species.json';

// --- CLASSIFICATION HELPERS ---
function isCarnivore(dino) {
  const diet = (dino.diet || '').toLowerCase();
  const family = (dino.family || '').toLowerCase();
  return (
    diet.includes('carnivore') ||
    diet.includes('meat') ||
    diet.includes('piscivore') ||
    diet.includes('live prey') ||
    family.includes('carnivore')
  );
}

function isHerbivore(dino) {
  const diet = (dino.diet || '').toLowerCase();
  const family = (dino.family || '').toLowerCase();
  return (
    diet.includes('herbivore') ||
    diet.includes('paleobotany') ||
    diet.includes('leaf') ||
    diet.includes('fiber') ||
    diet.includes('fruit') ||
    diet.includes('nut') ||
    diet.includes('omnivore') ||
    family.includes('ornithomimosaurid')
  );
}

function isScavenger(dino) {
  const family = (dino.family || '').toLowerCase();
  return (
    family.includes('scavenger') ||
    (dino.name || '').toLowerCase().includes('compsognathus') ||
    (dino.name || '').toLowerCase().includes('moros')
  );
}

function isSauropod(dino) {
  const family = (dino.family || '').toLowerCase();
  return family.includes('sauropod');
}

// --- VARIANT HELPERS ---
function getFemaleVariant(species) {
  if (!species.variants) return {};
  if (Array.isArray(species.variants)) {
    return species.variants.find((v) => v.variant === 'female') || species.variants[0] || {};
  }
  return species.variants.female || species.variants.male || {};
}

function getMaleVariant(species) {
  if (!species.variants) return {};
  if (Array.isArray(species.variants)) {
    return species.variants.find((v) => v.variant === 'male') || species.variants[0] || {};
  }
  return species.variants.male || {};
}

function getJuvenileVariant(species) {
  if (!species.variants) return {};
  if (Array.isArray(species.variants)) {
    return species.variants.find((v) => v.variant === 'juvenile') || species.variants[0] || {};
  }
  return species.variants.juvenile || {};
}

// --- TIERED COMPATIBILITY SYSTEM ---

/**
 * Evaluates relationship tier from the perspective of Dino A towards Dino B.
 * Returns: 'LIKES' | 'DISLIKES' | 'NEUTRAL'
 */
function getPairRelationship(dinoA, dinoB) {
  const likesA = (dinoA.likes || []).map((l) => l.toLowerCase());
  const dislikesA = (dinoA.dislikes || []).map((d) => d.toLowerCase());

  const familyA = (dinoA.family || '').toLowerCase();
  const familyB = (dinoB.family || '').toLowerCase();
  const nameA = (dinoA.name || '').toLowerCase();
  const nameB = (dinoB.name || '').toLowerCase();

  // 1. SCAVENGER IMMUNITY
  if (isScavenger(dinoB)) {
    const isSmallCarnivoreA = familyA.includes('small carnivore') || familyA.includes('raptor');
    if (!isSmallCarnivoreA) return 'NEUTRAL';
  }

  // 2. SAUROPOD DEFENSE (Bidirectional & Apex check)
  if ((isSauropod(dinoB) && isCarnivore(dinoA)) || (isSauropod(dinoA) && isCarnivore(dinoB))) {
    const carnivore = isCarnivore(dinoA) ? dinoA : dinoB;
    const carnivoreName = (carnivore.name || '').toLowerCase();
    
    const apexPredators = ['tyrannosaurus', 'giganotosaurus', 'indominus', 'acrocanthosaurus', 'carcharodontosaurus', 'scorpios'];
    const isApexPredator = apexPredators.some(apex => carnivoreName.includes(apex));

    if (!isApexPredator) return 'NEUTRAL';
  }

  // 3. EXPLICIT LIKES OVERRIDE
  if (likesA.some((l) => familyB.includes(l) || nameB.includes(l))) {
    return 'LIKES';
  }

  // 4. CARNIVORE VS HERBIVORE (Predation / Dislike)
  if (isCarnivore(dinoA) && isHerbivore(dinoB) && !isSauropod(dinoB)) {
    return 'DISLIKES';
  }

  // 5. CARNIVORE VS CARNIVORE (Rivalry)
  if (isCarnivore(dinoA) && isCarnivore(dinoB) && !isScavenger(dinoA) && !isScavenger(dinoB)) {
    if (nameA !== nameB) return 'DISLIKES';
  }

  // 6. EXPLICIT DISLIKES ARRAY CHECK
  const explicitlyHates = dislikesA.some((d) => {
    if (d === 'everything') return true;
    if (d.includes('herbivore')) return isHerbivore(dinoB);
    if (d.includes('carnivore')) return isCarnivore(dinoB);
    return familyB.includes(d) || nameB.includes(d);
  });

  if (explicitlyHates) return 'DISLIKES';

  // 7. DEFAULT FALLBACK
  return 'NEUTRAL';
}

/**
 * Checks bidirectional compatibility between two species.
 * Returns worst-case pair status: 'DISLIKES' > 'NEUTRAL' > 'LIKES'
 */
export function evaluateSpeciesPair(dinoA, dinoB) {
  const relA = getPairRelationship(dinoA, dinoB);
  const relB = getPairRelationship(dinoB, dinoA);

  if (relA === 'DISLIKES' || relB === 'DISLIKES') return 'DISLIKES';
  if (relA === 'NEUTRAL' || relB === 'NEUTRAL') return 'NEUTRAL';
  return 'LIKES';
}

/**
 * Scans dataset to find top compatible tankmates.
 * Uses a composite score combining Appeal Density + Terrain Overlap Similarity.
 */
export function findOptimalTankmates(paddockGroup) {
  const activeSpecies = paddockGroup
    .map((p) => speciesData.find((s) => s.id === p.speciesId))
    .filter(Boolean);

  if (activeSpecies.length === 0) return [];

  const activeHabitat = activeSpecies[0].habitat || 'terrestrial';

  // Extract all unique terrain keys currently required by the enclosure
  const activeTerrainKeys = new Set();
  activeSpecies.forEach((s) => {
    const femaleVar = getFemaleVariant(s);
    const envData = femaleVar.environment || s.terrain_percentages || {};
    Object.entries(envData).forEach(([terrain, val]) => {
      if (terrain !== 'prestige_area_ratio' && val > 0) activeTerrainKeys.add(terrain);
    });
  });

  return speciesData
    .filter((target) => (target.habitat || 'terrestrial') === activeHabitat) 
    .filter((target) => !paddockGroup.some((p) => p.speciesId === target.id))
    .filter((target) => {
      return activeSpecies.every(
        (active) => evaluateSpeciesPair(active, target) !== 'DISLIKES'
      );
    })
    .map((target) => {
      const femaleVar = getFemaleVariant(target);
      const appeal = femaleVar.appeal || femaleVar.prestige_base || 100;
      const appealPerHa = femaleVar.appeal_per_hectare || 1;
      const hectares = appealPerHa > 0 ? appeal / appealPerHa : 1;
      const appealDensityHa = hectares > 0 ? Math.round(appeal / hectares) : 0;

      const envData = femaleVar.environment || target.terrain_percentages || {};
      const targetKeys = Object.entries(envData)
        .filter(([k, val]) => k !== 'prestige_area_ratio' && val > 0)
        .map(([terrain]) => terrain);
      
      let overlapCount = 0;
      targetKeys.forEach((k) => {
        if (activeTerrainKeys.has(k)) overlapCount++;
      });
      
      const overlapRatio = targetKeys.length > 0 ? (overlapCount / targetKeys.length) : 1;

      // Composite Score: 50% Appeal Density + 50% Terrain Synergy
      const compositeScore = appealDensityHa * (0.5 + (0.5 * overlapRatio));

      return {
        id: target.id,
        name: target.name,
        family: target.family,
        diet: target.diet,
        appeal,
        density: appealDensityHa,
        overlapRatio,
        compositeScore,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 4);
}

/**
 * Main Calculation & Compatibility Engine
 */
export function calculatePaddockSpace(paddockGroup) {
  const maxEnv = {};
  let totalAppeal = 0;
  let totalDominance = 0;

  // Track populations for the 3 distinct feeder types
  let standardCarnivoreCount = 0;
  let livePreyCarnivoreCount = 0;
  let piscivoreCount = 0;

  paddockGroup.forEach(
    ({ speciesId, maleCount = 0, femaleCount = 0, juvenileCount = 0 }) => {
      const species = speciesData.find((s) => s.id === speciesId);
      if (!species) return;

      const validMales = species.restrictions?.has_males ? maleCount : 0;
      const validFemales = femaleCount;
      const validJuveniles = species.restrictions?.has_juveniles ? juvenileCount : 0;

      const totalAdults = validMales + validFemales;
      const totalDinos = totalAdults + validJuveniles;
      if (totalDinos === 0) return;

      const femaleVariant = getFemaleVariant(species);
      const maleVariant = getMaleVariant(species);
      const juvenileVariant = getJuvenileVariant(species);

      const extraAdults = Math.max(0, totalAdults - 1);
      const adultMultiplier = 1 + extraAdults * 0.15;

      // Direct game file environment m² calculation
      const envData = femaleVariant.environment || species.terrain_percentages || {};

      let rawTotalM2 = 0;
      Object.entries(envData).forEach(([terrain, val]) => {
        if (terrain === 'prestige_area_ratio' || val <= 0) return;
        rawTotalM2 += val > 1 ? val : val * 10000;
      });
      if (rawTotalM2 === 0) rawTotalM2 = 10000;

      Object.entries(envData).forEach(([terrain, val]) => {
        if (terrain === 'prestige_area_ratio' || val <= 0) return;

        let terrainBaseM2 = 0;
        if (val > 1) {
          // Direct raw m² requirement (e.g. Spinosaurus pasture: 3000, deep_water: 6000)
          terrainBaseM2 = val;
        } else if (femaleVariant.appeal && femaleVariant.appeal_per_hectare) {
          // Fallback ratio applied to calculated base area
          terrainBaseM2 = (femaleVariant.appeal / femaleVariant.appeal_per_hectare) * 10000 * val;
        } else {
          terrainBaseM2 = val * 10000;
        }

        const scaledNeed = terrainBaseM2 * adultMultiplier;
        const terrainRatio = val > 1 ? val / rawTotalM2 : val;
        const juviExtra = validJuveniles * 400 * terrainRatio;

        maxEnv[terrain] = Math.max(
          maxEnv[terrain] || 0,
          Math.round(scaledNeed + juviExtra)
        );
      });

      // --- APPEAL & DOMINANCE AGGREGATION ---
      const femaleAppeal = femaleVariant.appeal || femaleVariant.prestige_base || 0;
      const femaleDom = femaleVariant.dominance || femaleVariant.dominance_base || 0;
      if (validFemales > 0) {
        totalAppeal += femaleAppeal * validFemales;
        totalDominance += femaleDom * validFemales;
      }

      const maleAppeal = maleVariant.appeal || maleVariant.prestige_base || femaleAppeal;
      const maleDom = maleVariant.dominance || maleVariant.dominance_base || femaleDom;
      if (validMales > 0) {
        totalAppeal += maleAppeal * validMales;
        totalDominance += maleDom * validMales;
      }

      const juviAppeal = juvenileVariant.appeal || juvenileVariant.prestige_base || Math.round(femaleAppeal * 0.5);
      const juviDom = juvenileVariant.dominance || juvenileVariant.dominance_base || Math.round(femaleDom * 0.5);
      if (validJuveniles > 0) {
        totalAppeal += juviAppeal * validJuveniles;
        totalDominance += juviDom * validJuveniles;
      }

      // --- POPULATION-BASED FEEDER MATH ---
      const diet = (species.diet || '').toLowerCase();
      if (diet.includes('piscivore') || diet.includes('diet_fish')) {
        piscivoreCount += totalDinos;
      } else if (diet.includes('live prey') || diet.includes('prey')) {
        livePreyCarnivoreCount += totalDinos;
      } else if (diet.includes('carnivore') || diet.includes('meat')) {
        standardCarnivoreCount += totalDinos;
      }
    }
  );

  const totalAreaM2 = Object.values(maxEnv).reduce((sum, val) => sum + val, 0);
  const totalAreaHa = totalAreaM2 / 10000;
  const appealDensityHa = totalAreaHa > 0 ? Math.round(totalAppeal / totalAreaHa) : 0;

  const envPercentages = {};
  if (totalAreaM2 > 0) {
    Object.keys(maxEnv).forEach((terrain) => {
      if (maxEnv[terrain] > 0) {
        envPercentages[terrain] = Math.round(
          (maxEnv[terrain] / totalAreaM2) * 100
        );
      }
    });
  }

  // Feeder requirements (1 dispenser per 3 eating animals)
  const feederBreakdown = {
    meat: standardCarnivoreCount > 0 ? Math.ceil(standardCarnivoreCount / 3) : 0,
    livePrey: livePreyCarnivoreCount > 0 ? Math.ceil(livePreyCarnivoreCount / 3) : 0,
    fish: piscivoreCount > 0 ? Math.ceil(piscivoreCount / 3) : 0,
  };

  const activeSpecies = paddockGroup
    .map((p) => speciesData.find((s) => s.id === p.speciesId))
    .filter(Boolean);

  let synergyStatus = { code: 'GREEN', badge: 'Perfect Synergy (Explicit Likes)' };

  if (activeSpecies.length > 1) {
    let hasNeutral = false;
    let hasConflict = false;

    for (let i = 0; i < activeSpecies.length; i++) {
      for (let j = i + 1; j < activeSpecies.length; j++) {
        const pairStatus = evaluateSpeciesPair(activeSpecies[i], activeSpecies[j]);

        if (pairStatus === 'DISLIKES') {
          hasConflict = true;
          break;
        }
        if (pairStatus === 'NEUTRAL') {
          hasNeutral = true;
        }
      }
      if (hasConflict) break;
    }

    if (hasConflict) {
      synergyStatus = {
        code: 'RED',
        badge: 'Conflict Alert (Dinos Will Fight / Hunt)',
      };
    } else if (hasNeutral) {
      synergyStatus = {
        code: 'YELLOW',
        badge: 'Neutral Cohabitation (No dislikes)',
      };
    }
  }

  return {
    totalAppeal,
    totalDominance,
    totalAreaM2,
    totalAreaHa: parseFloat(totalAreaHa.toFixed(2)),
    appealDensity: appealDensityHa,
    feederBreakdown,
    envPercentages,
    envBreakdownM2: maxEnv,
    synergyStatus,
  };
}