/**
 * tr55_engine.js
 * Core Hydrologic & Environmental Engineering Calculation Module
 */

// Exact Curve Number Data Matrix mapped from TR-55 specifications
const CN_LOOKUP_MATRIX = {
    "1":  { A: 37,  A_D: 78, B: 59,  B_D: 78, C: 72,  C_D: 78, D: 78 }, // Trees over pervious
    "2":  { A: 96,  A_D: 96, B: 96,  B_D: 96, C: 96,  C_D: 96, D: 96 }, // Trees over Impervious
    "3":  { A: 39,  A_D: 80, B: 61,  B_D: 80, C: 74,  C_D: 80, D: 80 }, // Pervious
    "4":  { A: 100, A_D: 100,B: 100, B_D: 100,C: 100, C_D: 100,D: 100}, // Water
    "5":  { A: 98,  A_D: 98, B: 98,  B_D: 98, C: 98,  C_D: 98, D: 98 }, // Impervious
    "6":  { A: 77,  A_D: 94, B: 86,  B_D: 94, C: 91,  C_D: 94, D: 94 }, // Bare Earth
    "7":  { A: 30,  A_D: 77, B: 55,  B_D: 77, C: 70,  C_D: 77, D: 77 }, // Forested open space
    "8":  { A: 77,  A_D: 77, B: 77,  B_D: 77, C: 77,  C_D: 77, D: 77 }, // Forested wetland
    "9":  { A: 100, A_D: 100,B: 100, B_D: 100,C: 100, C_D: 100,D: 100}, // Wetlands
    "10": { A: 38,  A_D: 79, B: 60,  B_D: 79, C: 73,  C_D: 79, D: 79 }  // Scrub/Shrub/Palm
};

// Exact Annual Nonpoint Loading Export Vectors (CAST Phase 6 Land-Use Model)
const CAST_LOADING_RATES = {
    "1":  { n: 8.53,  p: 0.65, sed: 0.10 },
    "2":  { n: 20.49, p: 0.75, sed: 0.30 },
    "3":  { n: 11.19, p: 0.86, sed: 0.47 },
    "4":  { n: 0.00,  p: 0.00, sed: 0.00 },
    "5":  { n: 22.45, p: 0.83, sed: 1.49 },
    "6":  { n: 26.80, p: 3.21, sed: 14.55},
    "7":  { n: 1.68,  p: 0.08, sed: 0.07 },
    "8":  { n: 1.68,  p: 0.08, sed: 0.04 },
    "9":  { n: 1.68,  p: 0.08, sed: 0.04 },
    "10": { n: 1.62,  p: 0.36, sed: 0.29 }
};

/**
 * Calculates runoff tracking scenarios and pollutant loading variables.
 */
function calculateStormwaterModel(landCover, soilGroup, areaAcres, canopyChoice, rainScenarios) {
    // 1. Resolve Canopy Configuration Constants
    let Ci = 0.0;
    let CNadj = 0;
    if (canopyChoice === 'max') {
        Ci = 0.050;
        CNadj = -2;
    } else if (canopyChoice === 'mid') {
        Ci = 0.025;
        CNadj = -1;
    }

    // 2. Fetch Curve Number Settings
    const baseCN = CN_LOOKUP_MATRIX[landCover][soilGroup];
    
    // Water and pure Wetlands bypass variable deductions
    let finalCN = baseCN;
    if (baseCN < 100 && baseCN > 98) {
        finalCN = baseCN;
    } else {
        finalCN = Math.max(10, Math.min(98, baseCN + CNadj));
    }

    // Math Transformation: Maximum Soil Storage Potential
    const S = (1000 / finalCN) - 10;
    const Ia = 0.2 * S;

    // 3. Map Over Rain Array with Hynicka & Divers (2016) Equation Modifiers
    const compiledScenarios = rainScenarios.map(ev => {
        let runoffDepth = 0.0;
        const effectivePrecip = ev.P - Ci;

        if (effectivePrecip > Ia) {
            // Core TR-55 Canopy Variant Equation
            runoffDepth = Math.pow((effectivePrecip - Ia), 2) / ((effectivePrecip - Ia) + S);
        }

        // Unit Adjustments: 1 acre-inch = 3,630 cu ft = ~27,154.3 Gallons
        const volumeCf = runoffDepth * areaAcres * 3630;
        const volumeGal = volumeCf * 7.48052;

        return {
            name: ev.name,
            precipitation: ev.P,
            runoffDepth: runoffDepth,
            volumeCf: volumeCf,
            volumeGal: volumeGal
        };
    });

    // 4. Extract Total Structural Loading Output via CAST Rates
    const rates = CAST_LOADING_RATES[landCover];
    const pollutantLoads = {
        nitrogen: rates.n * areaAcres,
        phosphorus: rates.p * areaAcres,
        sediment: rates.sed * areaAcres
    };

    // Return structured engineering report object back to caller node
    return {
        baseCN,
        finalCN,
        S,
        scenarios: compiledScenarios,
        pollutantLoads
    };
}