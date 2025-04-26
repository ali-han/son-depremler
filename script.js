// Earthquake App - Refactored Version
class EarthquakeApp {
    constructor() {
      this.earthquakeList = document.getElementById("earthquake-list");
      this.loadingIndicator = document.getElementById("loading");
      this.lastUpdatedElement = document.getElementById("last-updated");
      this.magnitudeFilter = document.getElementById("magnitude-filter");
      this.regionFilter = document.getElementById("region-filter");
      this.searchInput = document.getElementById("search-input");
  
      this.earthquakes = [];
      this.filteredEarthquakes = [];
  
      this.init();
    }
  
    init() {
      this.setupEventListeners();
      this.initializeFilters();
      this.fetchEarthquakeData();
      this.updateLastUpdatedTime();
  
      // Auto-refresh every 5 minutes
      setInterval(() => {
        this.fetchEarthquakeData();
        this.updateLastUpdatedTime();
      }, 300000);
    }
  
    setupEventListeners() {
      this.magnitudeFilter.addEventListener("change", () => this.filterEarthquakes());
      this.regionFilter.addEventListener("change", () => this.filterEarthquakes());
      this.searchInput.addEventListener("input", () => this.filterEarthquakes());
    }
  
    initializeFilters() {
      // Initialize with empty counts, will be updated after data loads
      this.magnitudeFilter.innerHTML = `
        <option value="0">Tüm Büyüklükler</option>
        <option value="2">2.0+</option>
        <option value="3">3.0+</option>
        <option value="4">4.0+</option>
        <option value="5">5.0+</option>
        <option value="6">6.0+</option>
        <option value="7">7.0+</option>
      `;
    }
  
    updateLastUpdatedTime() {
      const now = new Date();
      this.lastUpdatedElement.textContent = now.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  
    updateStatus(message, isError = false) {
      if (this.loadingIndicator) {
        this.loadingIndicator.innerHTML = isError
          ? `<i class="fas fa-exclamation-circle"></i> ${message}`
          : `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        this.loadingIndicator.className = isError ? "error" : "";
        this.loadingIndicator.style.display = "block";
      }
      console.log(message);
    }
  
    hideStatus() {
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = "none";
      }
    }
  
    async fetchEarthquakeData() {
      this.updateStatus("Deprem verileri yükleniyor...");
      this.earthquakeList.innerHTML = "";
  
      try {
        const apiSources = this.getApiSources();
        const responses = await Promise.allSettled(
          apiSources.map((source) => this.fetchSource(source))
        );
  
        let allEarthquakes = [];
        let errors = [];
  
        responses.forEach((response, index) => {
          if (response.status === "fulfilled") {
            const source = apiSources[index];
            const parsedData = this.parseData(response.value, source);
            allEarthquakes = allEarthquakes.concat(parsedData);
          } else {
            errors.push(`Hata: ${apiSources[index].name} - ${response.reason.message}`);
          }
        });
  
        this.earthquakes = this.processEarthquakes(allEarthquakes);
        this.updateFilterCounts();
        this.filterEarthquakes();
  
        if (errors.length > 0) {
          this.updateStatus(`Veriler alındı, ancak ${errors.length} kaynakta hata oluştu.`, true);
        } else {
          this.hideStatus();
        }
      } catch (error) {
        this.updateStatus(`Veri alımında hata: ${error.message}`, true);
        console.error("Fetch error:", error);
      }
    }
  
    updateFilterCounts() {
      const magnitudeOptions = {
        2: this.earthquakes.filter(eq => eq.magnitude >= 2).length,
        3: this.earthquakes.filter(eq => eq.magnitude >= 3).length,
        4: this.earthquakes.filter(eq => eq.magnitude >= 4).length,
        5: this.earthquakes.filter(eq => eq.magnitude >= 5).length,
        6: this.earthquakes.filter(eq => eq.magnitude >= 6).length,
        7: this.earthquakes.filter(eq => eq.magnitude >= 7).length
      };
  
      this.magnitudeFilter.innerHTML = `
        <option value="0">Tüm Büyüklükler (${this.earthquakes.length})</option>
        <option value="2">2.0+ (${magnitudeOptions[2]})</option>
        <option value="3">3.0+ (${magnitudeOptions[3]})</option>
        <option value="4">4.0+ (${magnitudeOptions[4]})</option>
        <option value="5">5.0+ (${magnitudeOptions[5]})</option>
        <option value="6">6.0+ (${magnitudeOptions[6]})</option>
        <option value="7">7.0+ (${magnitudeOptions[7]})</option>
      `;
    }
  
    getApiSources() {
      const { starttime, endtime } = this.getDateRange();
  
      return [
        {
          name: "Kandilli",
          url: "data/son24saat.xml",
          type: "xml",
        },
        {
          name: "USGS",
          url: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${starttime}&endtime=${endtime}&minlatitude=35.0&maxlatitude=43.0&minlongitude=25.0&maxlongitude=45.0&minmagnitude=0`,
          type: "json",
        },
        {
          name: "EMSC",
          url: `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&starttime=${starttime}&endtime=${endtime}&minlatitude=35.0&maxlatitude=43.0&minlongitude=25.0&maxlongitude=45.0&minmag=2.5&orderby=time`,
          type: "json",
        },
      ];
    }
  
    getDateRange() {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
      const formatDate = (date) => date.toISOString().split("T")[0];
  
      return {
        endtime: formatDate(now),
        starttime: formatDate(yesterday),
      };
    }
  
    async fetchSource(source) {
      this.updateStatus(`${source.name} verisi alınıyor...`);
      const response = await fetch(source.url);
  
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
  
      return source.type === "xml" ? response.text() : response.json();
    }
  
    parseData(data, source) {
      try {
        return source.type === "xml"
          ? this.parseKandilliXml(data, source.name)
          : source.name === "USGS"
          ? this.parseUsgsJson(data, source.name)
          : this.parseEmscJson(data, source.name);
      } catch (error) {
        console.error(`Parsing error for ${source.name}:`, error);
        return [];
      }
    }
  
    parseKandilliXml(xmlText, sourceName) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const eqList = xmlDoc.documentElement;
  
      if (!eqList || eqList.tagName !== "eqlist") return [];
  
      const events = eqList.getElementsByTagName("earhquake");
      const earthquakes = [];
  
      for (const item of events) {
        const nameAttr = item.getAttribute("name");
        const latAttr = item.getAttribute("lat");
        const lonAttr = item.getAttribute("lng");
        const magAttr = item.getAttribute("mag");
        const depthAttr = item.getAttribute("Depth");
        const locationAttr = item.getAttribute("lokasyon");
  
        if (!nameAttr || !latAttr || !lonAttr || !magAttr || !depthAttr || !locationAttr) {
          continue;
        }
  
        const dateTimeString = nameAttr.substring(0, 19).replace(/\./g, "-").replace(" ", "T");
        const timestamp = new Date(dateTimeString + "Z");
  
        if (isNaN(timestamp.getTime())) continue;
  
        earthquakes.push({
          id: `${sourceName}_${latAttr}_${lonAttr}_${timestamp.getTime()}`,
          source: sourceName,
          time: timestamp,
          latitude: parseFloat(latAttr),
          longitude: parseFloat(lonAttr),
          magnitude: parseFloat(magAttr),
          depth: Math.abs(parseFloat(depthAttr)), // Handle negative depth values
          location: this.translateLocation(locationAttr.trim()),
          region: this.determineRegion(locationAttr.trim()),
        });
      }
  
      return earthquakes;
    }
  
    parseUsgsJson(data, sourceName) {
      if (!data || !data.features) return [];
  
      return data.features.map((feature) => ({
        id: `${sourceName}_${feature.id}`,
        source: sourceName,
        time: new Date(feature.properties.time),
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        magnitude: feature.properties.mag,
        depth: Math.abs(feature.geometry.coordinates[2]), // Handle negative depth values
        location: this.translateLocation(feature.properties.place),
        region: this.determineRegion(feature.properties.place),
      }));
    }
  
    parseEmscJson(data, sourceName) {
      if (!data || !data.features) return [];
  
      return data.features.map((feature) => ({
        id: `${sourceName}_${feature.id}`,
        source: sourceName,
        time: new Date(feature.properties.time),
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        magnitude: feature.properties.mag,
        depth: Math.abs(feature.geometry.coordinates[2]), // Handle negative depth values
        location: this.translateLocation(feature.properties.flynn_region),
        region: this.determineRegion(feature.properties.flynn_region),
      }));
    }
  
    translateLocation(location) {
      if (!location) return "Bilinmeyen Konum";
      
      const translations = {
        "WESTERN TURKEY": "Türkiye (Batı)",
        "EASTERN TURKEY": "Türkiye (Doğu)",
        "CENTRAL TURKEY": "Türkiye (İç Anadolu)",
        "MARMARA SEA": "Marmara Denizi",
        "AEGEAN SEA": "Ege Denizi",
        "MEDITERRANEAN SEA": "Akdeniz",
        "BLACK SEA": "Karadeniz",
        "GREEK ISLANDS": "Yunan Adaları",
        "CYPRUS REGION": "Kıbrıs Bölgesi",
        "IRAN": "İran",
        "SYRIA": "Suriye",
        "GEORGIA": "Gürcistan",
        "BULGARIA": "Bulgaristan",
        "ARMENIA": "Ermenistan",
        "AZERBAIJAN": "Azerbaycan",
        "IRAQ": "Irak",
      };
  
      const upperLocation = location.toUpperCase();
      return translations[upperLocation] || location;
    }
  
    determineRegion(location) {
      if (!location) return "other";
  
      const lowerLocation = location.toLowerCase();
  
      if (lowerLocation.includes("marmara")) return "marmara";
      if (lowerLocation.includes("ege") || lowerLocation.includes("izmir")) return "ege";
      if (lowerLocation.includes("akdeniz")) return "akdeniz";
      if (lowerLocation.includes("karadeniz")) return "karadeniz";
      if (lowerLocation.includes("anadolu") || lowerLocation.includes("konya") || lowerLocation.includes("ankara")) return "anadolu";
      if (lowerLocation.includes("doğu") || lowerLocation.includes("erzincan") || lowerLocation.includes("van")) return "dogu";
      if (lowerLocation.includes("güneydoğu") || lowerLocation.includes("diyarbakır") || lowerLocation.includes("şanlıurfa")) return "güneydoğu";
      if (lowerLocation.includes("yunanistan")) return "yunanistan";
      if (lowerLocation.includes("iran")) return "iran";
      if (lowerLocation.includes("suriye")) return "suriye";
      if (lowerLocation.includes("bulgaristan")) return "bulgaristan";
      if (lowerLocation.includes("gürcistan")) return "gürcistan";
      if (lowerLocation.includes("kıbrıs")) return "kıbrıs";
      if (lowerLocation.includes("kafkasya")) return "kafkasya";
  
      return "other";
    }
  
    processEarthquakes(earthquakes) {
      const grouped = this.groupSimilarEarthquakes(earthquakes);
      return grouped.sort((a, b) => b.time - a.time);
    }
  
    groupSimilarEarthquakes(earthquakes) {
      if (!earthquakes || earthquakes.length === 0) return [];
  
      earthquakes.sort((a, b) => a.time - b.time);
      const groups = [];
      const groupedIds = new Set();
      const TIME_WINDOW = 5 * 60 * 1000; // 5 minutes
      const DISTANCE_KM = 50; // 50 km
  
      for (let i = 0; i < earthquakes.length; i++) {
        const eq = earthquakes[i];
        if (groupedIds.has(eq.id)) continue;
  
        const group = {
          ...eq,
          sources: [eq.source],
          magnitudes: { [eq.source]: eq.magnitude },
        };
        groupedIds.add(eq.id);
  
        for (let j = i + 1; j < earthquakes.length; j++) {
          const otherEq = earthquakes[j];
          if (groupedIds.has(otherEq.id)) continue;
  
          const timeDiff = Math.abs(eq.time - otherEq.time);
          if (timeDiff > TIME_WINDOW) break;
  
          const distance = this.calculateDistance(
            eq.latitude,
            eq.longitude,
            otherEq.latitude,
            otherEq.longitude
          );
  
          if (distance <= DISTANCE_KM) {
            group.sources.push(otherEq.source);
            group.magnitudes[otherEq.source] = otherEq.magnitude;
  
            if (otherEq.time > group.time) {
              group.time = otherEq.time;
              group.location = otherEq.location;
            }
  
            groupedIds.add(otherEq.id);
          }
        }
  
        groups.push(group);
      }
  
      return groups;
    }
  
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.deg2rad(lat1)) *
          Math.cos(this.deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
  
    deg2rad(deg) {
      return deg * (Math.PI / 180);
    }
  
    filterEarthquakes() {
      const minMagnitude = parseFloat(this.magnitudeFilter.value) || 0;
      const region = this.regionFilter.value;
      const searchTerm = this.searchInput.value.toLowerCase();
  
      this.filteredEarthquakes = this.earthquakes.filter((earthquake) => {
        const magnitudeMatch = earthquake.magnitude >= minMagnitude;
        const regionMatch = region === "all" || earthquake.region === region;
        const searchMatch = earthquake.location.toLowerCase().includes(searchTerm);
  
        return magnitudeMatch && regionMatch && searchMatch;
      });
  
      this.renderEarthquakes();
    }
  
    renderEarthquakes() {
      this.earthquakeList.innerHTML = "";
  
      if (this.filteredEarthquakes.length === 0) {
        this.earthquakeList.innerHTML = `
          <div class="no-results">
            <i class="fas fa-info-circle"></i>
            <p>Filtre kriterlerinize uygun deprem bulunamadı</p>
          </div>
        `;
        return;
      }
  
      this.filteredEarthquakes.forEach((earthquake) => {
        const li = document.createElement("li");
        li.className = "earthquake-item";
  
        // Safely get magnitudes with fallback
        const magnitudes = earthquake.magnitudes || {};
        const magnitudeValues = Object.values(magnitudes).filter(
          (m) => typeof m === "number"
        );
  
        if (magnitudeValues.length === 0) {
          console.warn("No valid magnitudes for earthquake:", earthquake);
          return;
        }
  
        const maxMagnitude = Math.max(...magnitudeValues);
        const magnitudeClass = `magnitude-${Math.floor(maxMagnitude)}`;
  
        // Format time and time ago
        const now = new Date();
        const quakeTime = earthquake.time;
        const timeDiff = now - quakeTime;
        const timeAgo = this.formatTimeAgo(timeDiff);
        const formattedDate = quakeTime.toLocaleString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const formattedTime = quakeTime.toLocaleString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });
  
        // Safely format sources
        const sourcesText = Object.entries(magnitudes)
          .map(([source, mag]) => `${source} (${typeof mag === "number" ? mag.toFixed(1) : "N/A"})`)
          .join(", ");
  
        li.innerHTML = `
          <div class="earthquake-header">
            <div class="magnitude-container ${magnitudeClass}">
              <div class="magnitude">${maxMagnitude.toFixed(1)}</div>
              <div class="magnitude-label">Büyüklük</div>
            </div>
            <div class="time-container">
              <div class="time-ago">${timeAgo}</div>
              <div class="date">
                ${formattedDate}
                <div class="time">${formattedTime}</div>
              </div>
            </div>
          </div>
          
          <div class="location">${earthquake.location || "Konum bilgisi yok"}</div>
          
          <div class="detail-row">
            <span class="detail-label">Derinlik:</span>
            <span class="detail-value">${earthquake.depth.toFixed(1)} km</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Kaynaklar:</span>
            <span class="detail-value">${sourcesText}</span>
          </div>
          
          <button class="map-button">
            <i class="fas fa-map-marked-alt"></i> Haritada Göster <i class="fas fa-chevron-down"></i>
          </button>
          
          <div class="map-container">
            <div class="coordinates-container">
              <span class="coordinates-label">Koordinat Bilgisi:</span>
              <div class="coordinates">
                Enlem: ${earthquake.latitude.toFixed(4)}°<br>
                Boylam: ${earthquake.longitude.toFixed(4)}°
              </div>
            </div>
            <div class="map-links">
              <a href="https://maps.google.com/?q=${earthquake.latitude},${earthquake.longitude}" target="_blank" class="map-link">
                <i class="fab fa-google"></i> Google Maps
              </a>
              <a href="https://maps.apple.com/?q=${earthquake.latitude},${earthquake.longitude}" target="_blank" class="map-link">
                <i class="fab fa-apple"></i> Apple Haritalar
              </a>
              <a href="https://www.openstreetmap.org/?mlat=${earthquake.latitude}&mlon=${earthquake.longitude}" target="_blank" class="map-link">
                <i class="fas fa-map"></i> OpenStreetMap
              </a>
              <a href="https://yandex.com/maps/?pt=${earthquake.longitude},${earthquake.latitude}&z=12&l=map" target="_blank" class="map-link">
                <i class="fas fa-map-marked-alt"></i> Yandex Haritalar
              </a>
            </div>
          </div>
        `;
  
        // Add toggle functionality for map container
        const mapButton = li.querySelector(".map-button");
        const mapContainer = li.querySelector(".map-container");
  
        mapButton.addEventListener("click", () => {
          mapContainer.classList.toggle("active");
          mapButton.classList.toggle("active");
        });
  
        this.earthquakeList.appendChild(li);
      });
    }
  
    formatTimeAgo(milliseconds) {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
  
      if (seconds < 60) {
        return "Az önce";
      } else if (minutes < 60) {
        return `${minutes} dakika önce`;
      } else if (hours < 24) {
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 
          ? `${hours} saat ${remainingMinutes} dakika önce`
          : `${hours} saat önce`;
      } else if (days === 1) {
        return "1 gün önce";
      } else {
        return `${days} gün önce`;
      }
    }
  }
  
  // Initialize the app when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    new EarthquakeApp();
  });