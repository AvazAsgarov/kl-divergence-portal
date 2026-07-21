// ==========================================================================
// KL Divergence Interactive App Logic
// ==========================================================================

// Global DOM references
const meanPSlider = document.getElementById('mean-p');
const stdPSlider = document.getElementById('std-p');
const meanQSlider = document.getElementById('mean-q');
const stdQSlider = document.getElementById('std-q');

const meanPVal = document.getElementById('mean-p-val');
const stdPVal = document.getElementById('std-p-val');
const meanQVal = document.getElementById('mean-q-val');
const stdQVal = document.getElementById('std-q-val');

const klPQDisplay = document.getElementById('kl-pq-val');
const klQPDisplay = document.getElementById('kl-qp-val');
const asymmetryBox = document.getElementById('asymmetry-box');
const asymmetryText = document.getElementById('asymmetry-text');

// Formula step references
const formulaRawDisplay = document.getElementById('formula-raw-display');
const formulaStep1Display = document.getElementById('formula-step1-display');
let currentDirection = 'pq';

const mathLogTerm = document.getElementById('math-log-term');
const mathFracTerm = document.getElementById('math-frac-term');

const mathLogTermVal = document.getElementById('math-log-term-val');
const mathFracTermVal = document.getElementById('math-frac-term-val');
const mathFinalVal = document.getElementById('math-final-val');

let distributionChart = null;

// Generate range of x values from -6 to 6 with 0.1 increments
const generateXValues = () => {
    const xValues = [];
    for (let x = -6.0; x <= 6.0; x += 0.1) {
        xValues.push(parseFloat(x.toFixed(2)));
    }
    return xValues;
};

const xValues = generateXValues();

// Normal (Gaussian) Probability Density Function (PDF)
const normalPDF = (x, mean, stdDev) => {
    const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
    return coefficient * Math.exp(exponent);
};

// Calculate analytical KL Divergence between P and Q (Normal Distributions)
const calculateAnalyticalKL = (muP, sigmaP, muQ, sigmaQ) => {
    const logTerm = Math.log(sigmaQ / sigmaP);
    const fractionTerm = (Math.pow(sigmaP, 2) + Math.pow(muP - muQ, 2)) / (2 * Math.pow(sigmaQ, 2));
    const kl = logTerm + fractionTerm - 0.5;
    return {
        kl: Math.max(0, kl), // Prevent floating point rounding below 0
        logTerm: logTerm,
        fractionTerm: fractionTerm
    };
};

// Initialize Chart.js Chart
const initChart = () => {
    const ctx = document.getElementById('distribution-chart').getContext('2d');
    
    const dataP = xValues.map(x => normalPDF(x, 0.0, 1.0));
    const dataQ = xValues.map(x => normalPDF(x, 0.0, 1.0));

    distributionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: xValues,
            datasets: [
                {
                    label: 'P (Baseline / Real)',
                    data: dataP,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },
                {
                    label: 'Q (Current / Approximate)',
                    data: dataQ,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Inter',
                            size: 13,
                            weight: '500'
                        },
                        usePointStyle: true,
                        boxWidth: 16,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    titleFont: {
                        family: 'Inter',
                        size: 13
                    },
                    bodyFont: {
                        family: 'Inter',
                        size: 12
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        font: {
                            family: 'Inter',
                            size: 11
                        },
                        callback: function(val, index) {
                            return index % 10 === 0 ? this.getLabelForValue(val) : '';
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    min: 0,
                    max: 0.9
                }
            }
        }
    });
};

// Update chart and math based on slider values
const updateDashboard = () => {
    const muP = parseFloat(meanPSlider.value);
    const sigmaP = parseFloat(stdPSlider.value);
    const muQ = parseFloat(meanQSlider.value);
    const sigmaQ = parseFloat(stdQSlider.value);

    // Update text labels
    meanPVal.textContent = muP.toFixed(1);
    stdPVal.textContent = sigmaP.toFixed(1);
    meanQVal.textContent = muQ.toFixed(1);
    stdQVal.textContent = sigmaQ.toFixed(1);

    // Update distribution data on chart
    const dataP = xValues.map(x => normalPDF(x, muP, sigmaP));
    const dataQ = xValues.map(x => normalPDF(x, muQ, sigmaQ));
    distributionChart.data.datasets[0].data = dataP;
    distributionChart.data.datasets[1].data = dataQ;
    distributionChart.update('none');

    // Calculate D_KL(P || Q) and D_KL(Q || P)
    const klPQCalc = calculateAnalyticalKL(muP, sigmaP, muQ, sigmaQ);
    const klQPCalc = calculateAnalyticalKL(muQ, sigmaQ, muP, sigmaP);

    // Display values
    klPQDisplay.textContent = klPQCalc.kl.toFixed(4);
    klQPDisplay.textContent = klQPCalc.kl.toFixed(4);

    // Handle asymmetry visual feedback
    const diff = Math.abs(klPQCalc.kl - klQPCalc.kl);
    if (diff < 1e-4) {
        asymmetryBox.className = 'asymmetry-card alert-normal';
        asymmetryBox.querySelector('.asymmetry-header span').textContent = 'Symmetric Distributions';
        if (klPQCalc.kl === 0) {
            asymmetryText.innerHTML = 'Distributions are completely identical, hence divergence is <strong>0.0000</strong>.';
        } else {
            asymmetryText.innerHTML = 'Exceptional case: Distribution shapes differ, but mathematically yield the exact same divergence.';
        }
    } else {
        asymmetryBox.className = 'asymmetry-card alert-warning';
        asymmetryBox.querySelector('.asymmetry-header span').textContent = 'Asymmetry Active';
        asymmetryText.innerHTML = `D<sub>KL</sub>(P || Q) and D<sub>KL</sub>(Q || P) are different (Difference: <strong>${diff.toFixed(4)}</strong>). This demonstrates that KL divergence is asymmetric and <strong>not a distance metric</strong>.`;
    }

    // Dynamic math rendering depending on active tab direction
    if (currentDirection === 'pq') {
        formulaRawDisplay.innerHTML = `
            D<sub>KL</sub>(P || Q) = ln<span class="math-parenthesis">(</span><div class="math-fraction"><div class="math-numerator">&sigma;<sub>Q</sub></div><div class="math-denominator">&sigma;<sub>P</sub></div></div><span class="math-parenthesis">)</span> + 
            <div class="math-fraction">
                <div class="math-numerator">&sigma;<sub>P</sub><sup>2</sup> + (&mu;<sub>P</sub> - &mu;<sub>Q</sub>)<sup>2</sup></div>
                <div class="math-denominator">2&sigma;<sub>Q</sub><sup>2</sup></div>
            </div> - 0.5
        `;
        
        formulaStep1Display.innerHTML = `
            ln<span class="math-parenthesis">(</span><div class="math-fraction"><div class="math-numerator"><span class="math-val">${sigmaQ.toFixed(1)}</span></div><div class="math-denominator"><span class="math-val">${sigmaP.toFixed(1)}</span></div></div><span class="math-parenthesis">)</span> + 
            <div class="math-fraction">
                <div class="math-numerator"><span class="math-val">${sigmaP.toFixed(1)}</span><sup>2</sup> + (<span class="math-val">${muP.toFixed(1)}</span> - (${muQ.toFixed(1)}))<sup>2</sup></div>
                <div class="math-denominator">2 &times; <span class="math-val">${sigmaQ.toFixed(1)}</span><sup>2</sup></div>
            </div> - 0.5
        `;
        
        mathLogTerm.textContent = klPQCalc.logTerm.toFixed(3);
        mathFracTerm.textContent = klPQCalc.fractionTerm.toFixed(3);
        mathLogTermVal.textContent = klPQCalc.logTerm.toFixed(3);
        mathFracTermVal.textContent = klPQCalc.fractionTerm.toFixed(3);
        mathFinalVal.textContent = klPQCalc.kl.toFixed(4);
    } else {
        formulaRawDisplay.innerHTML = `
            D<sub>KL</sub>(Q || P) = ln<span class="math-parenthesis">(</span><div class="math-fraction"><div class="math-numerator">&sigma;<sub>P</sub></div><div class="math-denominator">&sigma;<sub>Q</sub></div></div><span class="math-parenthesis">)</span> + 
            <div class="math-fraction">
                <div class="math-numerator">&sigma;<sub>Q</sub><sup>2</sup> + (&mu;<sub>Q</sub> - &mu;<sub>P</sub>)<sup>2</sup></div>
                <div class="math-denominator">2&sigma;<sub>P</sub><sup>2</sup></div>
            </div> - 0.5
        `;
        
        formulaStep1Display.innerHTML = `
            ln<span class="math-parenthesis">(</span><div class="math-fraction"><div class="math-numerator"><span class="math-val">${sigmaP.toFixed(1)}</span></div><div class="math-denominator"><span class="math-val">${sigmaQ.toFixed(1)}</span></div></div><span class="math-parenthesis">)</span> + 
            <div class="math-fraction">
                <div class="math-numerator"><span class="math-val">${sigmaQ.toFixed(1)}</span><sup>2</sup> + (<span class="math-val">${muQ.toFixed(1)}</span> - (${muP.toFixed(1)}))<sup>2</sup></div>
                <div class="math-denominator">2 &times; <span class="math-val">${sigmaP.toFixed(1)}</span><sup>2</sup></div>
            </div> - 0.5
        `;
        
        mathLogTerm.textContent = klQPCalc.logTerm.toFixed(3);
        mathFracTerm.textContent = klQPCalc.fractionTerm.toFixed(3);
        mathLogTermVal.textContent = klQPCalc.logTerm.toFixed(3);
        mathFracTermVal.textContent = klQPCalc.fractionTerm.toFixed(3);
        mathFinalVal.textContent = klQPCalc.kl.toFixed(4);
    }
};

// Preset Scenario Manager
const applyPreset = (presetName) => {
    document.querySelectorAll('.preset-buttons .btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (presetName === 'identical') {
        document.getElementById('preset-identical').classList.add('active');
        meanPSlider.value = 0.0;
        stdPSlider.value = 1.0;
        meanQSlider.value = 0.0;
        stdQSlider.value = 1.0;
    } else if (presetName === 'drift') {
        document.getElementById('preset-drift').classList.add('active');
        meanPSlider.value = -0.5;
        stdPSlider.value = 1.0;
        meanQSlider.value = 0.8;
        stdQSlider.value = 1.2;
    } else if (presetName === 'variance') {
        document.getElementById('preset-variance').classList.add('active');
        meanPSlider.value = 0.0;
        stdPSlider.value = 1.0;
        meanQSlider.value = 0.0;
        stdQSlider.value = 2.2;
    }

    updateDashboard();
};

let wasDragging = false;

// Grab-to-Scroll layout logic for quiz cards grid
const initDragScroll = () => {
    const slider = document.querySelector('.quiz-grid');
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;
    const dragThreshold = 6;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        wasDragging = false;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active');
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active');
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const x = e.pageX - slider.offsetLeft;
        const walk = x - startX;
        
        if (Math.abs(walk) > dragThreshold) {
            wasDragging = true;
        }
        
        e.preventDefault();
        slider.scrollLeft = scrollLeft - walk * 1.5;
    });

    // Touch event support for mobile
    slider.addEventListener('touchstart', (e) => {
        isDown = true;
        wasDragging = false;
        startX = e.touches[0].pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    }, { passive: true });

    slider.addEventListener('touchend', () => {
        isDown = false;
    });

    slider.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - slider.offsetLeft;
        const walk = x - startX;
        
        if (Math.abs(walk) > dragThreshold) {
            wasDragging = true;
        }
        slider.scrollLeft = scrollLeft - walk * 1.5;
    }, { passive: true });
};

// Flip Card Handler for Quiz Section
window.flipCard = (cardElement) => {
    if (wasDragging) {
        wasDragging = false;
        return;
    }
    cardElement.classList.toggle('flipped');
};

// Set Formula Calculation Direction (pq or qp)
window.setFormulaDirection = (dir) => {
    currentDirection = dir;
    document.querySelectorAll('.formula-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (dir === 'pq') {
        document.getElementById('tab-pq').classList.add('active');
    } else {
        document.getElementById('tab-qp').classList.add('active');
    }
    updateDashboard();
};

// Event listeners setup
const initEvents = () => {
    const inputs = [meanPSlider, stdPSlider, meanQSlider, stdQSlider];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            document.querySelectorAll('.preset-buttons .btn').forEach(btn => {
                btn.classList.remove('active');
            });
            updateDashboard();
        });
    });
};

// Page load initialization
window.addEventListener('DOMContentLoaded', () => {
    initChart();
    initEvents();
    initDragScroll();
    updateDashboard();
});
