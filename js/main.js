mapboxgl.accessToken = "pk.eyJ1IjoiaXJ2aW5nMjA2IiwiYSI6ImNta3lxcWYzYTBhejYzZG9qeGE1NTZwNWYifQ.q3yHfLUJlNbuD54lTJD2rQ";

const START_ZOOM = 5;
const START_CENTER = [138, 38]; // Japan
const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";

const grades = [4, 5, 6];
const colors = ["rgb(208,209,230)", "rgb(103,169,207)", "rgb(1,108,89)"];
const radii = [5, 15, 20];

let earthquakeChart = null;
let earthquakes = null;

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v10",
  zoom: START_ZOOM,
  center: START_CENTER
});

// legend
(function buildLegend() {
  const legend = document.getElementById("legend");
  const labels = ["<strong>Magnitude</strong>"];

  for (let i = 0; i < grades.length; i++) {
    const v = grades[i];
    const dotR = 2 * radii[i];
    labels.push(
      `<p class="break">
        <i class="dot" style="background:${colors[i]}; width:${dotR}px; height:${dotR}px;"></i>
        <span class="dot-label" style="top:${dotR / 2}px;">${v}+</span>
      </p>`
    );
  }

  labels.push(
    `<p style="text-align:right; font-size:10pt">Source:
      <a href="https://earthquake.usgs.gov/earthquakes/" target="_blank">USGS</a></p>`
  );

  legend.innerHTML = labels.join("");
})();

function calEarthquakes(currentEarthquakes, currentMapBounds) {
  const classes = { 4: 0, 5: 0, 6: 0 };

  currentEarthquakes.features.forEach((f) => {
    const coords = f.geometry?.coordinates;
    const mag = f.properties?.mag;
    if (!coords || mag == null) return;

    if (currentMapBounds.contains(coords)) {
      const bucket = Math.floor(mag);
      if (bucket >= 6) classes[6] += 1;
      else if (bucket === 5) classes[5] += 1;
      else if (bucket === 4) classes[4] += 1;
    }
  });

  return classes;
}

function updateSidebarAndChart() {
  if (!earthquakes || !earthquakeChart) return;

  const magnitudes = calEarthquakes(earthquakes, map.getBounds());
  const total = magnitudes[4] + magnitudes[5] + magnitudes[6];
  document.getElementById("earthquake-count").innerHTML = total;

  const x = Object.keys(magnitudes); x.unshift("mag");
  const y = Object.values(magnitudes); y.unshift("#");
  earthquakeChart.load({ columns: [x, y] });
}

map.on("load", async () => {
  const res = await fetch(USGS_URL);
  earthquakes = await res.json();

  map.addSource("earthquakes", { type: "geojson", data: earthquakes });

  map.addLayer({
    id: "earthquakes-point",
    type: "circle",
    source: "earthquakes",
    paint: {
      "circle-radius": [
        "interpolate", ["linear"],
        ["coalesce", ["get", "mag"], 0],
        grades[0], radii[0],
        grades[1], radii[1],
        grades[2], radii[2]
      ],
      "circle-color": [
        "interpolate", ["linear"],
        ["coalesce", ["get", "mag"], 0],
        grades[0], colors[0],
        grades[1], colors[1],
        grades[2], colors[2]
      ],
      "circle-stroke-color": "white",
      "circle-stroke-width": 1,
      "circle-opacity": 0.6
    }
  });

  map.on("click", "earthquakes-point", (event) => {
    const f = event.features?.[0];
    if (!f) return;

    new mapboxgl.Popup()
      .setLngLat(f.geometry.coordinates)
      .setHTML(
        `<strong>Magnitude:</strong> ${f.properties.mag}<br/>
         <strong>Place:</strong> ${f.properties.place || ""}`
      )
      .addTo(map);
  });

  const magnitudes = calEarthquakes(earthquakes, map.getBounds());
  const x = Object.keys(magnitudes); x.unshift("mag");
  const y = Object.values(magnitudes); y.unshift("#");

  earthquakeChart = c3.generate({
    size: { height: 350, width: 460 },
    data: {
      x: "mag",
      columns: [x, y],
      type: "bar",
      colors: { "#": (d) => colors[d.x] },
      onclick: (d) => {
        const floor = parseInt(x[1 + d.x], 10);
        const ceiling = floor + 1;

        map.setFilter("earthquakes-point", [
          "all",
          [">=", ["get", "mag"], floor],
          ["<", ["get", "mag"], ceiling]
        ]);
      }
    },
    axis: { x: { type: "category" } },
    legend: { show: false },
    bindto: "#earthquake-chart"
  });

  updateSidebarAndChart();
});

map.on("idle", () => updateSidebarAndChart());

document.getElementById("reset").addEventListener("click", (e) => {
  e.preventDefault();
  map.flyTo({ zoom: START_ZOOM, center: START_CENTER });
  map.setFilter("earthquakes-point", null);
});