# Lab 6 – Smart Dashboard

## Live Dashboard
https://irving0604.github.io/lab6-dashboard/

## Topic
This smart dashboard visualizes earthquake activity using data from the USGS Earthquake Hazards Program.

## Data Source
- United States Geological Survey (USGS)
- GeoJSON Earthquake Feed  
https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php

## Map Type
This project uses a **proportional symbol map**. Each earthquake is represented as a circle, with the circle size proportional to earthquake magnitude.

This map type was chosen because earthquake data is point-based and magnitude varies continuously. Proportional symbols allow for direct visual comparison of earthquake strength across locations.

## Dashboard Components
- Interactive Mapbox map with proportional symbols
- Bar chart showing earthquake counts by magnitude
- Dynamic count of earthquakes in the current map view
- Reset button to return to original map extent

## File Structure
- index.html
- css/style.css
- js/main.js
