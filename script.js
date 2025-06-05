// ✅ UPDATED: Added 'Are you sure?' confirmation popup before forwarding recommendation + hover triggers on confirm buttons

const co2File = "pivot_co2.csv";
const luxFile = "pivot_lux.csv";
const splFile = "pivot_spl.csv";
const plotlyDiv = document.getElementById("interactivePlotly");

const dropdown = document.createElement("select");
dropdown.id = "metricDropdown";
dropdown.className = "custom-dropdown";
dropdown.style.cssText = `
  padding: 6px 12px;
  border: 1px solid #c6d7e5;
  border-radius: 10px;
  background: white;
  color: #003366;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  appearance: ;
  cursor: pointer;
`;

["lux", "spl", "co2"].forEach(metric => {
  const option = document.createElement("option");
  option.value = metric;
  option.textContent = metric.toUpperCase();
  dropdown.appendChild(option);
});


const thresholds = {
  co2: 535,
  spl: 45,
  lux: 300
};

const thresholdTitles = {
  lux: "ABOUT LUX",
  co2: "ABOUT CO₂",
  spl: "ABOUT SPL"
};

const thresholdDescriptions = {
  lux: "The lux threshold is 300 lux.",
  co2: "The CO₂ threshold is 535 ppm.",
  spl: "The SPL threshold is 45 dB."
};

const zoneList = ["49", "48", "27", "51", "52", "31"];
const layoutGrid = [
  ["Zone 49", "Zone 48", "Zone 27"],
  ["Zone 51", "Zone 52", "Zone 31"]
];

let fullData = {};
let activityScores = {};

Promise.all([d3.csv(co2File), d3.csv(luxFile), d3.csv(splFile)]).then(([co2Data, luxData, splData]) => {
  const co2At19 = co2Data.find(row => row["Hour"] === "19");
  const luxAt19 = luxData.find(row => row["Hour"] === "19");
  const splAt19 = splData.find(row => row["Hour"] === "19");

  zoneList.forEach(zone => {
    const col = `Average (${zone})`;
    const co2 = parseFloat(co2At19[col]);
    const lux = parseFloat(luxAt19[col]);
    const spl = parseFloat(splAt19[col]);

    let score = 0;
    if (lux >= thresholds.lux) score += 0.5;
    if (co2 >= thresholds.co2) score += 0.2;
    if (spl >= thresholds.spl) score += 0.3;
    score = Math.round(score * 10) / 10;
    activityScores[`Zone ${zone}`] = score;
  });

  const z = layoutGrid.map(row => row.map(zone => activityScores[zone]));

  const annotations = layoutGrid.flatMap((row, rowIdx) =>
    row.map((zone, colIdx) => ({
      x: colIdx, y: rowIdx, text: zone.toUpperCase(), showarrow: false,
      font: { color: '#111', size: 18, family: 'Inter, sans-serif', weight: 'bold' },
      xref: 'x', yref: 'y', align: 'center'
    }))
  );

  const trace = {
    z: z,
    type: 'heatmap',
    hoverinfo: 'text',
    text: layoutGrid,
    showscale: false,
    colorscale: [[0, '#cce6ff'], [0.3, '#66b2ff'], [0.6, '#0059b3'], [1, '#003366']],
    zmin: 0, zmax: 1
  };

  const layout = {
    title: {
      text: "Current Office Occupation",
      font: { family: 'Inter, sans-serif', size: 22, color: 'hsl(226, 64%, 35%)', weight: '700' },
      x: 0.5, xanchor: 'center'
    },
    width: 800, height: 500,
    margin: { t: 60, l: 0, r: 0, b: 0 },
    annotations,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    xaxis: { showgrid: false, showticklabels: false, ticks: '', showline: false, range: [-0.5, 2.5] },
    yaxis: { showgrid: false, showticklabels: false, ticks: '', showline: false, autorange: false, range: [1.5, -0.5] },
    font: { family: 'Inter, sans-serif', size: 16 }
  };

  zoneList.forEach(zone => {
    const col = `Average (${zone})`;
    fullData[`Zone ${zone}`] = {
      lux: luxData.map(row => parseFloat(row[col])),
      spl: splData.map(row => parseFloat(row[col])),
      co2: co2Data.map(row => parseFloat(row[col]))
    };
  });

  Plotly.newPlot(plotlyDiv, [trace], layout).then(() => {
    const styleButtonHover = (btn, bg, transform) => {
      btn.style.backgroundColor = bg;
      btn.style.transform = transform;
    };

    plotlyDiv.on('plotly_click', function (data) {
      const point = data.points[0];
      const row = point.y;
      const col = point.x;
      const zoneName = layoutGrid[row][col];
      const zoneScore = activityScores[zoneName];

      document.getElementById("zoneDetails").style.display = "block";
      document.getElementById("zoneTitle").innerHTML = `You selected: ${zoneName.toUpperCase()} `;
      document.getElementById("zoneTitle").appendChild(dropdown);

      const renderSelectedMetric = () => {
        const selectedMetric = dropdown.value;
        const dataArray = fullData[zoneName][selectedMetric];
        const threshold = thresholds[selectedMetric];

        document.getElementById("thresholdInfo").style.display = "block";
        document.getElementById("thresholdLabel").innerText = thresholdTitles[selectedMetric];
        document.getElementById("thresholdValue").innerText = thresholdDescriptions[selectedMetric];

        let traceType = "scatter";
        let traceExtra = { mode: "lines+markers" };
        if (selectedMetric === "lux") traceExtra.fill = "tozeroy";
        if (selectedMetric === "co2") {
          traceType = "bar";
          traceExtra = { marker: { color: "#66b2ff" }, opacity: 0.6 };
        }

        const trace = Object.assign({
          x: [...Array(24).keys()],
          y: dataArray,
          name: selectedMetric.toUpperCase(),
          type: traceType,
          line: { color: "#3399ff" }
        }, traceExtra);

        const thresholdLine = {
          type: 'line', xref: 'paper', x0: 0, x1: 1,
          y0: threshold, y1: threshold,
          line: { color: '#003366', width: 2, dash: 'dot' }
        };

        const thresholdAnnotation = {
          xref: 'paper', yref: 'y', x: 1.01, y: threshold,
          text: 'threshold', showarrow: false, yshift: -12,
          font: { color: '#003366', size: 12, family: 'Inter, sans-serif', weight: 'bold' },
          align: 'left'
        };

        const yAxisTitles = {
          lux: "Lux",
          co2: "PPM",
          spl: "dB"
        };
        
        Plotly.newPlot("zoneGraph", [trace], {
          title: `${selectedMetric.toUpperCase()} PATTERNS`,
          width: 560,
          height: 320,
          xaxis: {
            title: {
              text: "Hours",
              font: {
                family: 'Inter, sans-serif',
                size: 14,
                color: '#003366'
              }
            },
            tickmode: "array",
            tickvals: [...Array(24).keys()],
            ticktext: [...Array(24).keys()]
          },
          yaxis: {
            title: {
              text: yAxisTitles[selectedMetric],
              font: {
                family: 'Inter, sans-serif',
                size: 14,
                color: '#003366'
              }
            }
          },
          margin: { t: 40, l: 60, r: 40, b: 60 },  // ⬅️ increased space for axis titles
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          autosize: true,
          shapes: [thresholdLine],
          annotations: [thresholdAnnotation]
        });
        
        

        function formatHour(hour) {
          const period = hour >= 12 ? "PM" : "AM";
          const formatted = hour % 12 === 0 ? 12 : hour % 12;
          return `${formatted}:00${period}`;
        }

        const firstDropIndex = dataArray.findIndex((v, i) => i > 0 && v < threshold && dataArray[i - 1] >= threshold);
        const hourText = firstDropIndex >= 0 ? formatHour(firstDropIndex) : "no drop detected";

        let recommendation = "";
        let buttonHTML = "";

        if (zoneScore < 0.3) {
          recommendation = "<strong>→ This zone has already initiated night time sequence.</strong>";
          buttonHTML = `<button class="btn" disabled style="background: #ccc; cursor: not-allowed; color: #fff; margin-top: 12px; border-radius: 12px;">Begin sequence?</button>`;
        } else {
          recommendation = zoneScore < 0.5
            ? "<strong>→ It is recommended to begin night time sequence within the hour for this zone.</strong>"
            : "<strong>→ It is not yet recommended to begin night time sequence for this zone.</strong>";

          buttonHTML = `<button class="btn action-btn" style="margin-top: 12px; background: #003366; color: #fff; border-radius: 12px; transition: all 0.15s ease;">Begin sequence?</button>`;
        }

        document.getElementById("zoneSummary").innerHTML = `
          <div class="summary-container">
            On average, ${zoneName} falls below the <strong>${selectedMetric.toUpperCase()}</strong> threshold at ${hourText}.<br><br>
            ${recommendation}<br>
            ${buttonHTML}
            <div id="confirmationBox" style="display:none; margin-top:10px; color:#003366; font-weight:500;"></div>
            <div id="popupConfirm" style="display:none; margin-top:10px; padding:12px; border-radius:8px; background:#f1f5ff; border:1px solid #003366; color:#003366;">
              Are you sure?<br>
              <button id="confirmYes" style="margin-top:8px; margin-right:8px; padding:6px 12px; background:#003366; color:white; border:none; border-radius:8px; cursor:pointer; transition: all 0.15s ease;">Yes</button>
              <button id="confirmNo" style="padding:6px 12px; background:#ccc; color:#333; border:none; border-radius:8px; cursor:pointer; transition: all 0.15s ease;">Cancel</button>
            </div>
          </div>`;

        const actionBtn = document.querySelector(".action-btn");
        const confirmationBox = document.getElementById("confirmationBox");
        const popupConfirm = document.getElementById("popupConfirm");

        if (actionBtn) {
          actionBtn.addEventListener("click", () => {
            popupConfirm.style.display = "block";
          });

          actionBtn.addEventListener("mouseenter", () => styleButtonHover(actionBtn, "#0059b3", "scale(1)"));
          actionBtn.addEventListener("mouseleave", () => styleButtonHover(actionBtn, "#003366", "scale(1)"));
          actionBtn.addEventListener("mousedown", () => styleButtonHover(actionBtn, "#003366", "scale(0.96)"));
          actionBtn.addEventListener("mouseup", () => styleButtonHover(actionBtn, "#003366", "scale(1)"));
        }

        const yesBtn = document.getElementById("confirmYes");
        const noBtn = document.getElementById("confirmNo");

        yesBtn?.addEventListener("mouseenter", () => styleButtonHover(yesBtn, "#0059b3", "scale(1)"));
        yesBtn?.addEventListener("mouseleave", () => styleButtonHover(yesBtn, "#003366", "scale(1)"));
        yesBtn?.addEventListener("mousedown", () => styleButtonHover(yesBtn, "#003366", "scale(0.96)"));
        yesBtn?.addEventListener("mouseup", () => styleButtonHover(yesBtn, "#003366", "scale(1)"));

        noBtn?.addEventListener("mouseenter", () => styleButtonHover(noBtn, "#b3b3b3", "scale(1)"));
        noBtn?.addEventListener("mouseleave", () => styleButtonHover(noBtn, "#ccc", "scale(1)"));
        noBtn?.addEventListener("mousedown", () => styleButtonHover(noBtn, "#ccc", "scale(0.96)"));
        noBtn?.addEventListener("mouseup", () => styleButtonHover(noBtn, "#ccc", "scale(1)"));

        yesBtn?.addEventListener("click", () => {
          confirmationBox.style.display = "block";
          confirmationBox.innerText = "We've forwarded your recommendation to the HVAC admins.";
          popupConfirm.style.display = "none";
          if (actionBtn) {
            actionBtn.disabled = true;
            actionBtn.style.cursor = "not-allowed";
            actionBtn.style.backgroundColor = "#ccc";
          }
        });

        noBtn?.addEventListener("click", () => {
          popupConfirm.style.display = "none";
        });
      };

      renderSelectedMetric();
      dropdown.onchange = renderSelectedMetric;
    });

    document.getElementById("closeZoneDetails").addEventListener("click", () => {
      document.getElementById("zoneDetails").style.display = "none";
    });
  });
});
