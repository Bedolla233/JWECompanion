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
    dino.name.toLowerCase().includes('compsognathus') ||
    dino.name.toLowerCase().includes('moros')
  );
}

function isSauropod(dino) {
  const family = (dino.family || '').toLowerCase();
  return family.includes('sauropod');
}

/**
 * Robust helper to check if Dino A dislikes or hunts Dino B
 */
export function dinoHatesTarget(dinoA, dinoB) {
  const dislikesA = (dinoA.dislikes || []).map((d) => d.toLowerCase());
  const likesA = (dinoA.likes || []).map((l) => l.toLowerCase());

  const familyA = (dinoA.family || '').toLowerCase();
  const familyB = (dinoB.family || '').toLowerCase();
  const nameA = (dinoA.name || '').toLowerCase();
  const nameB = (dinoB.name || '').toLowerCase();

  // 1. SCAVENGER IMMUNITY
  if (isScavenger(dinoB)) {
    const isSmallCarnivoreA =
      familyA.includes('small carnivore') || familyA.includes('raptor');
    if (!isSmallCarnivoreA) return false;
  }

  // 2. SAUROPOD DEFENSE
  if (isSauropod(dinoB) && isCarnivore(dinoA)) {
    const explicitlyHatesSauropod = dislikesA.some(
      (d) => d.includes('sauropod') || d === 'everything'
    );
    if (!explicitlyHatesSauropod) return false;
  }

  // 3. EXPLICIT LIKES OVERRIDE
  if (likesA.some((l) => familyB.includes(l) || nameB.includes(l))) {
    return false;
  }

  // 4. CARNIVORE VS HERBIVORE (Predation)
  if (isCarnivore(dinoA) && isHerbivore(dinoB) && !isSauropod(dinoB)) {
    return true;
  }

  // 5. CARNIVORE VS CARNIVORE (Rivalry)
  if (
    isCarnivore(dinoA) &&
    isCarnivore(dinoB) &&
    !isScavenger(dinoA) &&
    !isScavenger(dinoB)
  ) {
    if (nameA !== nameB) {
      return true;
    }
  }

  // 6. DISLIKES ARRAY CHECK
  if (dislikesA.length === 0) return false;

  return dislikesA.some((d) => {
    if (d === 'everything') return true;
    if (d.includes('herbivore')) return isHerbivore(dinoB);
    if (d.includes('carnivore')) return isCarnivore(dinoB);
    return familyB.includes(d) || nameB.includes(d);
  });
}

/**
 * Scans dataset to find top compatible tankmates for the active paddock,
 * strictly restricted by habitat type (Terrestrial, Aerial, or Aquatic).
 */
export function findOptimalTankmates(paddockGroup) {
  const activeSpecies = paddockGroup
    .map((p) => speciesData.find((s) => s.id === p.speciesId))
    .filter(Boolean);

  if (activeSpecies.length === 0) return [];

  // Determine active paddock habitat (default to 'terrestrial' if unspecified)
  const activeHabitat = activeSpecies[0].habitat || 'terrestrial';

  return speciesData
    .filter((target) => target.habitat === activeHabitat) // Strict habitat match restriction
    .filter((target) => !paddockGroup.some((p) => p.speciesId === target.id))
    .filter((target) => {
      return activeSpecies.every(
        (active) =>
          !dinoHatesTarget(active, target) && !dinoHatesTarget(target, active)
      );
    })
    .map((target) => {
      const femaleVar = target.variants?.female || {};
      const appeal = femaleVar.appeal || 100;
      const hectares = femaleVar.appeal_per_hectare
        ? appeal / femaleVar.appeal_per_hectare
        : 1;
      const appealDensityHa = hectares > 0 ? Math.round(appeal / hectares) : 0;
      return {
        id: target.id,
        name: target.name,
        family: target.family,
        diet: target.diet,
        appeal,
        density: appealDensityHa,
      };
    })
    .sort((a, b) => b.density - a.density)
    .slice(0, 4);
}

/**
 * Main Calculation & Compatibility Engine
 */
export function calculatePaddockSpace(paddockGroup) {
  // Use a dynamic object to capture all 21 sparse terrain/palaeobotany/feed keys correctly
  const maxEnv = {};
  const maxFeeders = { meat: 0, fish: 0 };
  let totalAppeal = 0;
  let totalDominance = 0;

  paddockGroup.forEach(
    ({ speciesId, maleCount = 0, femaleCount = 0, juvenileCount = 0 }) => {
      const species = speciesData.find((s) => s.id === speciesId);
      if (!species) return;

      const validMales = species.restrictions?.has_males ? maleCount : 0;
      const validFemales = femaleCount;
      const validJuveniles = species.restrictions?.has_juveniles
        ? juvenileCount
        : 0;

      const totalAdults = validMales + validFemales;
      if (totalAdults + validJuveniles === 0) return;

      const femaleVariant = species.variants?.female || {};
      const baseHectares =
        femaleVariant.appeal && femaleVariant.appeal_per_hectare
          ? femaleVariant.appeal / femaleVariant.appeal_per_hectare
          : 1;
      const baseM2 = baseHectares * 10000;

      const extraAdults = Math.max(0, totalAdults - 1);
      const adultMultiplier = 1 + extraAdults * 0.15;

      Object.keys(species.terrain_percentages || {}).forEach((terrain) => {
        const ratio = species.terrain_percentages[terrain] || 0;
        if (ratio > 0) {
          const scaledNeed = baseM2 * ratio * adultMultiplier;
          const juviExtra = validJuveniles * 400 * ratio;
          maxEnv[terrain] = Math.max(
            maxEnv[terrain] || 0,
            Math.round(scaledNeed + juviExtra)
          );
        }
      });

      if (species.variants?.female && validFemales > 0) {
        totalAppeal += species.variants.female.appeal * validFemales;
        totalDominance += species.variants.female.dominance * validFemales;
      }
      if (species.variants?.male && validMales > 0) {
        totalAppeal += species.variants.male.appeal * validMales;
        totalDominance += species.variants.male.dominance * validMales;
      }
      if (species.variants?.juvenile && validJuveniles > 0) {
        totalAppeal += species.variants.juvenile.appeal * validJuveniles;
        totalDominance += species.variants.juvenile.dominance * validJuveniles;
      }

      if (species.diet?.includes('Carnivore'))
        maxFeeders.meat = Math.max(
          maxFeeders.meat,
          2 + Math.floor(extraAdults / 2)
        );
      if (species.diet?.includes('Piscivore'))
        maxFeeders.fish = Math.max(
          maxFeeders.fish,
          3 + Math.floor(extraAdults / 2)
        );
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

  const activeSpecies = paddockGroup
    .map((p) => speciesData.find((s) => s.id === p.speciesId))
    .filter(Boolean);

  let synergyStatus = { code: 'GREEN', badge: 'Perfect Compatibility' };

  for (let i = 0; i < activeSpecies.length; i++) {
    for (let j = i + 1; j < activeSpecies.length; j++) {
      const dinoA = activeSpecies[i];
      const dinoB = activeSpecies[j];

      if (dinoHatesTarget(dinoA, dinoB) || dinoHatesTarget(dinoB, dinoA)) {
        synergyStatus = {
          code: 'RED',
          badge: 'Conflict Alert (Dinos Will Fight)',
        };
        break;
      }
    }
    if (synergyStatus.code === 'RED') break;
  }

  return {
    totalAppeal,
    totalDominance,
    totalAreaM2,
    totalAreaHa: parseFloat(totalAreaHa.toFixed(2)),
    appealDensity: appealDensityHa,
    feederBreakdown: maxFeeders,
    envPercentages,
    envBreakdownM2: maxEnv,
    synergyStatus,
  };
}