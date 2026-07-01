/**
 * app.js
 * Application UI Orchestration & Controller Layer
 */

let rainfallPresets = {};

// Handle Initial async fetching of configuration payloads
async function loadRainfallData() {
    try {
        const response = await fetch('rainfall_data.json');
        if (!response.ok) throw new Error('Network response was not ok');
        
        rainfallPresets = await response.json();
        updateRainfallPresets();
    } catch (error) {
        console.error("Failed to fetch rainfall data repository:", error);
    }
}
window.onload = loadRainfallData;

function updateRainfallPresets() {
    const selectedCity = document.getElementById('cityPreset').value;
    if (rainfallPresets[selectedCity]) {
        const data = rainfallPresets[selectedCity];
        document.getElementById('p1').value = data.p1;
        document.getElementById('p2').value = data.p2;
        document.getElementById('p10').value = data.p10;
        document.getElementById('p25').value = data.p25;
        document.getElementById('p100').value = data.p100;
    }
}

// Scrape structural DOM inputs and route to math core
function executeModelWorkflow() {
    const landCover = document.getElementById('landCover').value;
    const soilGroup = document.getElementById('soilGroup').value;
    const areaAcres = parseFloat(document.getElementById('area').value) || 0;
    const canopyChoice = document.getElementById('canopyChoice').value;

    const rainScenarios = [
        { name: "1-Year",  P: parseFloat(document.getElementById('p1').value) || 0 },
        { name: "2-Year",  P: parseFloat(document.getElementById('p2').value) || 0 },
        { name: "10-Year", P: parseFloat(document.getElementById('p10').value) || 0 },
        { name: "25-Year", P: parseFloat(document.getElementById('p25').value) || 0 },
        { name: "100-Year",P: parseFloat(document.getElementById('p100').value) || 0 }
    ];

    // TR-55 Core Engine Processing Call Node
    const results = calculateStormwaterModel(landCover, soilGroup, areaAcres, canopyChoice, rainScenarios);

    // Render Hydrologic Result Objects back to UI Nodes
    const tbody = document.getElementById('hydrologyTableBody');
    tbody.innerHTML = '';

    results.scenarios.forEach(ev => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${ev.name} Storm Event</strong></td>
            <td>${ev.precipitation.toFixed(2)}</td>
            <td>${ev.runoffDepth.toFixed(3)}</td>
            <td>${Math.round(ev.volumeCf).toLocaleString()}</td>
            <td>${Math.round(ev.volumeGal).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });

    // Populate Parameter Output Metric Badges
    document.getElementById('outBaseCN').innerText = results.baseCN;
    document.getElementById('outFinalCN').innerText = results.finalCN.toFixed(0);
    document.getElementById('outS').innerText = results.S.toFixed(3);
    
    document.getElementById('outLoadN').innerText = results.pollutantLoads.nitrogen.toFixed(2);
    document.getElementById('outLoadP').innerText = results.pollutantLoads.phosphorus.toFixed(2);
    document.getElementById('outLoadSed').innerText = results.pollutantLoads.sediment.toFixed(2);

    document.getElementById('results').style.display = 'block';
}