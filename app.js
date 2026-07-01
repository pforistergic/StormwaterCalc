// app.js

// 1. Regional 24-Hour Rainfall Depth Datastore (NOAA Atlas 14 Historical Profile Approximations)
const rainfallPresets = {
    austin:  { p1: 3.4, p2: 4.1, p10: 6.2, p25: 7.6,  p100: 10.2 },
    chicago: { p1: 2.3, p2: 2.7, p10: 3.9, p25: 4.7,  p100: 6.1  },
    denver:  { p1: 1.2, p2: 1.5, p10: 2.2, p25: 2.7,  p100: 3.6  },
    miami:   { p1: 4.5, p2: 5.4, p10: 8.2, p25: 10.1, p100: 13.0 },
    seattle: { p1: 1.8, p2: 2.1, p10: 2.9, p25: 3.4,  p100: 4.2  }
};

// 2. Triggered when the user picks a city from the dropdown element
function updateRainfallPresets() {
    const selectedCity = document.getElementById('cityPreset').value;
    
    // If a valid city preset matches our profile data store, populate the numeric fields
    if (rainfallPresets[selectedCity]) {
        const data = rainfallPresets[selectedCity];
        document.getElementById('p1').value = data.p1;
        document.getElementById('p2').value = data.p2;
        document.getElementById('p10').value = data.p10;
        document.getElementById('p25').value = data.p25;
        document.getElementById('p100').value = data.p100;
    }
}

// 3. Core Engine Runoff Analysis
function calculateTR55() {
    const soilGroup = document.getElementById('soilGroup').value;
    const landCover = document.getElementById('landCover').value;
    const canopyPct = Math.min(100, Math.max(0, parseFloat(document.getElementById('canopy').value) || 0));
    const areaAcres = parseFloat(document.getElementById('area').value) || 0;

    const cnMatrix = {
        impervious: { A: 98, B: 98, C: 98, D: 98 },
        open_space: { A: 39, B: 61, C: 74, D: 80 },
        bare_soil:  { A: 77, B: 86, C: 91, D: 94 },
        woods:      { A: 30, B: 55, C: 70, D: 77 }
    };

    let baseCN = cnMatrix[landCover][soilGroup];
    let targetWoodsCN = cnMatrix['woods'][soilGroup];
    let finalCN = baseCN;

    if (landCover !== 'impervious') {
        const reductionPotential = baseCN - targetWoodsCN;
        finalCN = baseCN - (reductionPotential * (canopyPct / 100.0));
    }
    
    finalCN = Math.max(10, Math.min(98, finalCN));
    const S = (1000 / finalCN) - 10;

    const scenarios = [
        { name: "1-Year",  P: parseFloat(document.getElementById('p1').value) || 0 },
        { name: "2-Year",  P: parseFloat(document.getElementById('p2').value) || 0 },
        { name: "10-Year", P: parseFloat(document.getElementById('p10').value) || 0 },
        { name: "25-Year", P: parseFloat(document.getElementById('p25').value) || 0 },
        { name: "100-Year",P: parseFloat(document.getElementById('p100').value) || 0 }
    ];

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    scenarios.forEach(ev => {
        let runoffDepth = 0;
        const initialAbstraction = 0.2 * S;

        if (ev.P > initialAbstraction) {
            runoffDepth = Math.pow((ev.P - initialAbstraction), 2) / (ev.P + (0.8 * S));
        }

        const runoffVolumeCf = runoffDepth * areaAcres * 3630;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${ev.name} 24-hr</strong></td>
            <td>${ev.P.toFixed(2)}</td>
            <td>${runoffDepth.toFixed(2)}</td>
            <td>${Math.round(runoffVolumeCf).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('outCN').innerText = finalCN.toFixed(1);
    document.getElementById('results').style.display = 'block';
}