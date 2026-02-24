// ====== Mapbox token ======
mapboxgl.accessToken = "pk.eyJ1IjoiaXJ2aW5nMjA2IiwiYSI6ImNta3lxcWYzYTBhejYzZG9qeGE1NTZwNWYifQ.q3yHfLUJlNbuD54lTJD2rQ";

// ====== Map init ======
const START_ZOOM = 5;
const START_CENTER = [138, 38]; // Japan
const MIN_ZOOM = 2;

// USGS GeoJSON feed (no local file needed)
const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v10",
  zoom: START_ZOOM,
  minZoom: MIN_ZOOM,
  center: START_CENTER
});

// ====== Variables ======
let earthquakeChart = null;
let earthquakes = null;

// Magnitude classes (keep same idea as your template)
const grades = [4, 5, 6];
const colors = ["rgb(208,209,230)", "rgb(103,169,207)", "rgb(1,108,89)"];
const radii = [5, 15, 20];

// ====== Legend ======
function buildLegend() {
  const legend = document.getElementById("legend");

  const labels = ['<strong>Magnitude</strong>'];
  for (let i = 0; i < grades.length; i++) {
    const v = grades[i];
    const dotR = 2 * radii[i]; // match your legend scaling trick
    labels.push(
      `<p class="break">
        <i class="dot" style="background:${colors[i]}; width:${dotR}px; height:${dotR}px;"></i>
        <span class="dot-label" style="top:${dotR / 2}px;">${v}+</span>
      </p>`
    );
  }

  const source = `<p style="text-align:right; font-size:10pt">Source:
    <a href="https://earthquake.usgs.gov/earthquakes/" target="_blank">USGS</a></p>`;

  legend.innerHTML = labels.join("") + source;
}
buildLegend();

// ====== Helpers ======
function calEarthquakes(currentEarthquakes, currentMapBounds) {
  const magnitudesClasses = { 4: 0, 5: 0, 6: 0 };

  currentEarthquakes.features.forEach((f) => {
    const coords = f.geometry && f.geometry.coordinates;
    const mag = f.properties && f.properties.mag;

    // skip bad rows
    if (!coords || mag == null) return;

    // only count in current view
    if (currentMapBounds.contains(coords)) {
      const bucket = Math.floor(mag);
      if (bucket >= 6) magnitudesClasses[6] += 1;
      else if (bucket === 5) magnitudesClasses[5] += 1;
      else if (bucket === 4) magnitudesClasses[4] += 1;
    }
  });

  return magnitudesClasses;
}

function updateSidebarAndChart() {
  if (!earthquakes || !earthquakeChart) return;

  const magnitudes = calEarthquakes(earthquakes, map.getBounds());
  const numEarthquakes = magnitudes[4] + magnitudes[5] + magnitudes[6];

  document.getElementById("earthquake-count").innerHTML = numEarthquakes;

  const x = Object.keys(magnitudes); // ["4","5","6"]
  x.unshift("mag");
  const y = Object.values(magnitudes);
  y.unshift("#");

  earthquakeChart.load({ columns: [x, y] });
}

// ====== Data fetch + map layer ======
async function geojsonFetch() {
  const response = await fetch(USGS_URL);
  earthquakes = await response.json();

  map.on("load", () => {
    map.addSource("earthquakes", { type: "geojson", data: earthquakes });

    map.addLayer(
      {
        id: "earthquakes-point",
        type: "circle",
        source: "earthquakes",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "mag"], 0],
            grades[0], radii[0],
            grades[1], radii[1],
            grades[2], radii[2]
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "mag"], 0],
            grades[0], colors[0],
            grades[1], colors[1],
            grades[2], colors[2]
          ],
          "circle-stroke-color": "white",
          "circle-stroke-width": 1,
          "circle-opacity": 0.6
        }
      },
      "waterway-label"
    );

    // popup
    map.on("click", "earthquakes-point", (event) => {
      const f = event.features && event.features[0];
      if (!f) return;

      new mapboxgl.Popup()
        .setLngLat(f.geometry.coordinates)
        .setHTML(`<strong>Magnitude:</strong> ${f.properties.mag}<br/><strong>Place:</strong> ${f.properties.place || ""}`)
        .addTo(map);
    });

    map.on("mouseenter", "earthquakes-point", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "earthquakes-point", () => (map.getCanvas().style.cursor = ""));

    // create chart once
    const magnitudes = calEarthquakes(earthquakes, map.getBounds());
    const x = Object.keys(magnitudes); x.unshift("mag");
    const y = Object.values(magnitudes); y.unshift("#");

    earthquakeChart = c3.generate({
      size: { height: 350, width: 460 },
      data: {
        x: "mag",
        columns: [x, y],
        type: "bar",
        colors: {
          "#": (d) => colors[d.x] // d.x is 0,1,2 -> maps to colors
        },
        onclick: (d) => {
          // filter map by selected bucket
          const floor = parseInt(x[1 + d.x], 10);
          const ceiling = floor + 1;

          map.setFilter("earthquakes-point", [
            "all",
            [">=", ["get", "mag"], floor],
            ["<", ["get", "mag"], ceiling]
          ]);
        }
      },
      axis: {
        x: { type: "category" },
        y: { tick: { values: [5, 10, 20, 30, 40] } }
      },
      legend: { show: false },
      bindto: "#earthquake-chart"
    });

    // initial sidebar number
    updateSidebarAndChart();
  });

  // update when map stops moving
  map.on("idle", () => {
    updateSidebarAndChart();
  });
}

geojsonFetch().catch((err) => {
  console.error(err);
  alert("Data failed to load. Check console.");
});

// ====== Reset button ======
document.getElementById("reset").addEventListener("click", (event) => {
  event.preventDefault();

  map.flyTo({ zoom: START_ZOOM, center: START_CENTER });
  map.setFilter("earthquakes-point", null);

  // chart + count will update on idle
});
