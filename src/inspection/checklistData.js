// CBLP BMP Inspection Checklist Definitions
// Extracted from CBLP BMP Checklists v7

export const CHECKLIST_CATEGORIES = {
  vegetated: {
    id: "vegetated",
    title: "Vegetated Practices",
    subtitle:
      "Bioretention, Rain Gardens, Bioswales, Filter Strips, Living Walls, Buffers/Shoreline, Constructed Wetlands, Infiltration w/ Vegetation",
    pdfPages: "Pages 1–3",
    components: [
      {
        name: "Drainage Area",
        checkItems: [
          "Erosion in contributing drainage area",
          "Sediment, grit, or dirt accumulation",
          "Soil stockpiles present",
          "Bare or uncompacted soil",
          "Chemicals, oil, or automotive fluids observed",
        ],
        observationPrompt: "Drainage area observations & plan conformity notes:",
      },
      {
        name: "Inlets to Practice",
        checkItems: [
          "Pipes / curb cuts / sheetflow inlets obstructed or clogged",
          "Erosion or scour around inlet apron/energy dissipation",
          "Sediment accumulation at inlet",
          "Structural damage, cracking, or settlement at headwall/curb",
        ],
        observationPrompt: "Inlet condition and energy dissipator notes:",
      },
      {
        name: "Pre-Treatment (Forebay / Filter Strip / Stone Pad)",
        checkItems: [
          "Pre-treatment cell > 50% full of sediment (clean-out required)",
          "Erosion or rills within pre-treatment structure",
          "Structural problems with check dams, berms, or stone pad",
          "Trash, floatables, or excessive organic debris accumulation",
        ],
        observationPrompt: "Pre-treatment sediment depth & structural notes:",
      },
      {
        name: "Ponding Area & Filter Bed / Infiltration Surface",
        checkItems: [
          "Standing water > 48 hours post-storm (drawdown failure)",
          "Sediment, silt, or crust accumulation on filter media surface",
          "Sinkholes, piping, or preferential flow channels",
          "Bare soil or loss of required mulch layer (recommended 2-3\")",
          "Mulch floating, washed away, or excessively matted",
        ],
        observationPrompt: "Ponding depth, mulch condition, and surface infiltration notes:",
      },
      {
        name: "Vegetation Health & Coverage",
        checkItems: [
          "Bare patches or dead/diseased vegetation",
          "Invasive plant species or weed infestation observed",
          "Vegetation cover < 85% of design area",
          "Vegetation overgrown, impeding flow or visibility",
          "Pruning, trimming, or seasonal cutback required",
        ],
        observationPrompt: "Dominant plant species, weed types, and replanting recommendations:",
      },
      {
        name: "Outlets & Overflow Structures",
        checkItems: [
          "Underdrain(s) / cleanout pipes obstructed, clogged, or capped",
          "Overflow weir/grate obstructed with debris, trash, or sediment",
          "Flow by-passing or short-circuiting designed treatment path",
          "Erosion or scour at outfall or receiving channel",
          "Structural cracks, displacement, or leaning at overflow riser",
        ],
        observationPrompt: "Outlet functionality, overflow crest, and underdrain observation:",
      },
    ],
  },
  permeable: {
    id: "permeable",
    title: "Permeable Pavement",
    subtitle:
      "Permeable Interlocking Concrete Pavers (PICP), Grid Pavers, Permeable Asphalt, Permeable Concrete",
    pdfPages: "Pages 4–5",
    components: [
      {
        name: "Drainage Area & Run-on",
        checkItems: [
          "Erosion or sediment wash-on from adjacent unpaved/turf areas",
          "High sediment or grit accumulation from vehicular traffic",
          "Oil, fuel, or chemical staining observed",
          "Run-on ratio exceeds plan specifications",
        ],
        observationPrompt: "Run-on sources and contributing area notes:",
      },
      {
        name: "Permeable Pavement Surface",
        checkItems: [
          "Sediment / fines accumulation in joints or voids",
          "Weed, moss, or grass growth in joints or pores",
          "Standing water or ponding observed after storm event",
          "Depression, rutting, settlement, or sinkholes",
          "Cracking, spalling, raveling, or loose paver blocks",
          "Joint material missing or eroded below recommended level",
        ],
        observationPrompt: "Pavement condition, void clogging, and vacuum sweeping needs:",
      },
      {
        name: "Overflow / Inlets / Underdrains",
        checkItems: [
          "Observation wells / cleanout caps missing or damaged",
          "Water ponding in subbase observation wells > 48 hours",
          "Curb overflow inlets or scuppers obstructed",
          "Flow by-passing pavement surface to storm drain",
          "Erosion or sediment deposition at pavement edges",
        ],
        observationPrompt: "Underdrain discharge and observation well water level:",
      },
    ],
  },
  rainwater: {
    id: "rainwater",
    title: "Rainwater Harvesting",
    subtitle: "Above-ground & Underground Rainwater Cisterns, Rain Barrels, Storage Tanks",
    pdfPages: "Pages 6–7",
    components: [
      {
        name: "Roof Area & Gutters",
        checkItems: [
          "Overhanging tree branches depositing heavy leaf litter",
          "Gutters or downspouts sagging, clogged, or leaking",
          "Debris screens missing or damaged on downspouts",
        ],
        observationPrompt: "Roof catchment condition and gutter notes:",
      },
      {
        name: "Pre-Treatment Filtration",
        checkItems: [
          "First-flush diverter / vortex filter full of sediment",
          "Pre-treatment filter bypassed or overflowing",
          "Filter mesh torn, clogged, or missing",
        ],
        observationPrompt: "First-flush diverter cleanout observations:",
      },
      {
        name: "Tank / Cistern Structure",
        checkItems: [
          "Tank settling, leaning, or foundation cracking",
          "Visible leaks, seepage, or cracks in tank body/joints",
          "Inlet/outlet connection pipes loose or leaking",
          "Access lids, inspection ports, or insect screens missing/damaged",
          "Excessive algae growth or sediment buildup on tank bottom",
        ],
        observationPrompt: "Tank structural integrity, fittings, and sedimentation notes:",
      },
      {
        name: "Drawdown, Pump & Overflow",
        checkItems: [
          "Pump, electrical controls, or float switches malfunctioning",
          "Overflow pipe obstructed, disconnected, or unarmored",
          "Erosion at overflow discharge point",
          "Drawdown or water reuse system non-operational",
        ],
        observationPrompt: "Pump operation, overflow stability, and reuse system notes:",
      },
    ],
  },
  vegetated_roof: {
    id: "vegetated_roof",
    title: "Vegetated Roofs (Green Roofs)",
    subtitle: "Intensive & Extensive Vegetated Green Roof Systems",
    pdfPages: "Pages 8–9",
    components: [
      {
        name: "Roof Type & System Condition",
        checkItems: [
          "Extensive system (< 6\" media) / Intensive system (> 6\" media)",
          "Growth media erosion, wind scour, or thin spots",
          "Root barrier or waterproofing membrane exposure",
        ],
        observationPrompt: "Media depth, wind erosion, and system type notes:",
      },
      {
        name: "Vegetation Coverage & Health",
        checkItems: [
          "Sedum or vegetation coverage < 80%",
          "Large bare patches, dead or diseased plant clusters",
          "Weed, tree seedling, or invasive plant establishment",
          "Nutrient deficiency or excessive moss/algae growth",
        ],
        observationPrompt: "Plant health, percent coverage, and weeding needs:",
      },
      {
        name: "Drains, Scuppers & Flashing",
        checkItems: [
          "Drain inspection boxes / gravel borders clogged with debris",
          "Vegetation growing into gravel edge strips or drain boxes",
          "Parapet flashing or scupper outlets damaged or obstructed",
          "Ponding water observed near drains > 24 hours post-storm",
        ],
        observationPrompt: "Drain box clearance and perimeter gravel strip notes:",
      },
      {
        name: "Irrigation & Leak Detection",
        checkItems: [
          "Drip irrigation or sprinkler system leaks or damaged lines",
          "Timer, moisture sensors, or automated controls malfunctioning",
          "Evidence of ceiling leaks in building space below",
        ],
        observationPrompt: "Irrigation testing and building structural notes:",
      },
    ],
  },
};

/**
 * Automatically determine the CBLP checklist category based on the BMP facility type.
 * Maps all 16 UMBC stormwater facility types directly to the 4 CBLP checklist templates.
 *
 * @param {string} facilityType - e.g. "Micro-Bioretention", "Porous Pavement", etc.
 * @returns {"vegetated" | "permeable" | "rainwater" | "vegetated_roof"}
 */
export function determineChecklistCategory(facilityType = "") {
  const ft = (facilityType || "").toLowerCase().trim();

  // 1. Permeable Pavement (Pages 4–5): Porous Pavement, Permeable Concrete/Asphalt, Pavers
  if (
    ft.includes("permeable") ||
    ft.includes("porous") ||
    ft.includes("pavement") ||
    ft.includes("paver")
  ) {
    return "permeable";
  }

  // 2. Rainwater Harvesting (Pages 6–7): Storage Tanks, Cisterns
  if (
    ft.includes("rainwater") ||
    ft.includes("tank") ||
    ft.includes("cistern") ||
    ft.includes("harvest")
  ) {
    return "rainwater";
  }

  // 3. Vegetated Roofs (Pages 8–9): Green Roof, Vegetated Roof
  // (Exclude "nonrooftop" so NonRooftop Disconnection doesn't match!)
  if (
    (ft.includes("green roof") || ft.includes("vegetated roof") || ft.includes("roof")) &&
    !ft.includes("nonrooftop") &&
    !ft.includes("non-rooftop")
  ) {
    return "vegetated_roof";
  }

  // 4. Vegetated Practices (Pages 1–3):
  // Micro-Bioretention, Bioretention, Rain Gardens, Wet Swales, Grass Swales,
  // Submerged Gravel Wetland, NonRooftop Disconnection, Detention/Retention Ponds,
  // Wet Ponds, Sediment Basins, Surface/Underground Sand Filters.
  return "vegetated";
}
